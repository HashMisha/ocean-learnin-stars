/*
 * Ocean learnin' stars — API для Yandex Cloud Functions (вызывается через API Gateway: /api/{proxy+}).
 *
 * Хранилища:   YDB Serverless (Document API, совместимый с DynamoDB) — пользователи, материалы, журналы;
 *              Object Storage — файлы материалов (бакет закрытый, ссылки на скачивание — временные).
 * Вход:        Яндекс ID (OAuth). Пароли сайт не хранит; в базе — id, логин и отображаемое имя.
 * Проверка:    Yandex Vision — распознавание текста (OCR) и классификация (неприемлемое, водяные знаки, качество).
 * Советник:    YandexGPT (если указан YC_FOLDER_ID и модель).
 *
 * Переменные окружения (задаёт server/deploy.sh):
 *   DOCAPI_ENDPOINT, BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, JWT_SECRET, ADMIN_LOGINS (через запятую),
 *   SITE_ORIGIN, YC_FOLDER_ID, GPT_MODEL (yandexgpt-lite по умолчанию), TRUST_AFTER (3 — сколько первых публикаций проверяет человек)
 */
'use strict';
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ENV = process.env;
const T = { users: 'ols_users', materials: 'ols_materials', events: 'ols_events', data: 'ols_user_data', settings: 'ols_settings' };
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ru-central1', endpoint: ENV.DOCAPI_ENDPOINT }), { marshallOptions: { removeUndefinedValues: true } });
const s3 = new S3Client({ region: 'ru-central1', endpoint: 'https://storage.yandexcloud.net' });
const MAX_SIZE = 20 * 1024 * 1024;
const TYPES = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};
const GROUPS = ['g1', 'g2', 'g3'];
const SEASONS = ['winter', 'spring', 'summer', 'autumn', 'all'];

/* ---------- Ответы ---------- */
function cors(origin) {
  const allowed = (ENV.SITE_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = !allowed.length || allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin || '');
  return {
    'Access-Control-Allow-Origin': ok && origin ? origin : allowed[0] || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Vary': 'Origin'
  };
}
const reply = (status, body, origin) => ({ statusCode: status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors(origin)), body: JSON.stringify(body) });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

/* ---------- Сессии (JWT HS256 без внешних библиотек) ---------- */
const b64 = (buf) => Buffer.from(buf).toString('base64url');
function signJwt(payload) {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(Object.assign({ exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }, payload)));
  const sig = b64(crypto.createHmac('sha256', ENV.JWT_SECRET).update(head + '.' + body).digest());
  return head + '.' + body + '.' + sig;
}
function verifyJwt(token) {
  const [h, b, s] = String(token || '').split('.');
  if (!h || !b || !s) return null;
  const sig = b64(crypto.createHmac('sha256', ENV.JWT_SECRET).update(h + '.' + b).digest());
  if (sig.length !== s.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(s))) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  return p.exp > Date.now() / 1000 ? p : null;
}
async function currentUser(headers) {
  const auth = headers.Authorization || headers.authorization || '';
  const p = verifyJwt(auth.replace(/^Bearer\s+/i, ''));
  if (!p) return null;
  const r = await db.send(new GetCommand({ TableName: T.users, Key: { id: p.sub } }));
  return r.Item || null;
}
const isAdmin = (u) => !!u && (ENV.ADMIN_LOGINS || '').split(/[,;]/).map((s) => s.trim().toLowerCase()).includes(String(u.login).toLowerCase());
function need(user, admin) {
  if (!user) throw new HttpError(401, 'Войдите через Яндекс ID');
  if (admin && !isAdmin(user)) throw new HttpError(403, 'Нужны права администратора');
}

/* ---------- Проверки ---------- */
const langOk = (s) => { const t = String(s || '').trim(); return !t || (/[а-яё]/i.test(t) && !/[a-z]/i.test(t)); };
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const uid = () => crypto.randomUUID();

async function logEvent(type, data) {
  await db.send(new PutCommand({ TableName: T.events, Item: Object.assign({ id: uid(), type, date: new Date().toISOString() }, data) }));
}

// Yandex Vision: распознавание текста. Возвращает весь найденный текст.
async function ocr(iam, buf, mime) {
  const r = await fetch('https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + iam, 'x-folder-id': ENV.YC_FOLDER_ID },
    body: JSON.stringify({ mimeType: mime === 'application/pdf' ? 'application/pdf' : 'image', languageCodes: ['ru', 'en'], model: 'page', content: buf.toString('base64') })
  });
  if (!r.ok) throw new Error('OCR ' + r.status);
  const j = await r.json();
  return (j.result && j.result.textAnnotation && j.result.textAnnotation.fullText) || '';
}

// Yandex Vision: классификация (неприемлемое содержимое, водяные знаки, качество).
async function classify(iam, buf) {
  const r = await fetch('https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + iam },
    body: JSON.stringify({
      folderId: ENV.YC_FOLDER_ID,
      analyze_specs: [{ content: buf.toString('base64'), features: [
        { type: 'CLASSIFICATION', classificationConfig: { model: 'moderation' } },
        { type: 'CLASSIFICATION', classificationConfig: { model: 'quality' } }
      ] }]
    })
  });
  if (!r.ok) throw new Error('Vision ' + r.status);
  const j = await r.json();
  const out = {};
  ((j.results && j.results[0] && j.results[0].results) || []).forEach((res) => {
    ((res.classification && res.classification.properties) || []).forEach((p) => { out[p.name] = p.probability; });
  });
  return out;
}

/*
 * Решение по материалу: { status: 'published' | 'pending' | 'rejected', reason }.
 * Сомнительное — на ручную проверку, а не в ленту.
 */
async function moderate(iam, item, buf, user) {
  if (![item.title, item.description, (item.tags || []).join(' ')].every(langOk)) return { status: 'rejected', reason: 'Название, описание или теги не на русском языке' };
  const kind = TYPES[item.mime];
  if (kind === 'image' || kind === 'pdf') {
    try {
      const text = await ocr(iam, buf, item.mime);
      const latin = (text.match(/[a-z]/gi) || []).length;
      if (latin >= 3) return { status: 'rejected', reason: 'На изображении есть текст не на русском языке' };
    } catch (e) { return { status: 'pending', reason: 'Не удалось распознать текст — нужна ручная проверка' }; }
  }
  if (kind === 'image') {
    try {
      const c = await classify(iam, buf);
      if ((c.adult || 0) > 0.5 || (c.gruesome || 0) > 0.5) return { status: 'rejected', reason: 'Неподходящее для детей изображение' };
      if ((c.watermarks || 0) > 0.6) return { status: 'rejected', reason: 'На изображении водяной знак или логотип' };
      if ((c.low || 0) > 0.7) return { status: 'rejected', reason: 'Низкое качество изображения' };
      if ((c.adult || 0) > 0.2 || (c.gruesome || 0) > 0.2 || (c.watermarks || 0) > 0.3) return { status: 'pending', reason: 'Сомнительный результат проверки изображения' };
    } catch (e) { return { status: 'pending', reason: 'Не удалось проверить изображение — нужна ручная проверка' }; }
  }
  if (kind === 'docx') return { status: 'pending', reason: 'Документы Word проверяет модератор' };
  if (isAdmin(user)) return { status: 'published' };
  if ((user.published || 0) < Number(ENV.TRUST_AFTER || 3)) return { status: 'pending', reason: 'Первые публикации нового автора проверяет модератор' };
  return { status: 'published' };
}

async function readObject(key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
  const chunks = [];
  for await (const c of r.Body) chunks.push(c);
  return Buffer.concat(chunks);
}
const fileUrl = (key) => getSignedUrl(s3, new GetObjectCommand({ Bucket: ENV.BUCKET, Key: key }), { expiresIn: 6 * 3600 });

async function publicView(m) {
  return {
    id: m.id, title: m.title, description: m.description, groups: m.groups, seasons: m.seasons, subjects: m.subjects,
    tags: m.tags, holidays: m.holidays, type: m.type, kind: TYPES[m.mime], mime: m.mime, author: m.authorName,
    date: m.date, width: m.width, height: m.height, url: await fileUrl(m.key)
  };
}

/* ---------- Маршруты ---------- */
const routes = {
  'GET health': async () => ({ ok: true }),

  // Вход: токен Яндекс ID → своя сессия.
  'POST auth/yandex': async ({ body }) => {
    const r = await fetch('https://login.yandex.ru/info?format=json', { headers: { Authorization: 'OAuth ' + body.token } });
    if (!r.ok) throw new HttpError(401, 'Яндекс ID не подтвердил вход');
    const info = await r.json();
    const id = 'ya:' + info.id;
    const old = (await db.send(new GetCommand({ TableName: T.users, Key: { id } }))).Item || {};
    const user = Object.assign({ published: 0, created: new Date().toISOString() }, old, { id, login: info.login, name: info.display_name || info.real_name || info.login });
    await db.send(new PutCommand({ TableName: T.users, Item: user }));
    return { token: signJwt({ sub: id }), user: { name: user.name, login: user.login, admin: isAdmin(user) } };
  },

  'GET me': async ({ user }) => { need(user); return { name: user.name, login: user.login, admin: isAdmin(user), published: user.published || 0 }; },

  // Избранное и история советника.
  'GET me/data': async ({ user }) => { need(user); return (await db.send(new GetCommand({ TableName: T.data, Key: { userId: user.id } }))).Item || { favorites: [], history: [] }; },
  'PUT me/data': async ({ user, body }) => {
    need(user);
    const cur = (await db.send(new GetCommand({ TableName: T.data, Key: { userId: user.id } }))).Item || { userId: user.id };
    if (Array.isArray(body.favorites)) cur.favorites = body.favorites.map(String).slice(0, 2000);
    if (Array.isArray(body.history)) cur.history = body.history.slice(-40).map((m) => ({ role: m.role === 'user' ? 'user' : 'bot', text: clean(m.text, 6000), question: clean(m.question, 500) }));
    await db.send(new PutCommand({ TableName: T.data, Item: cur }));
    return { ok: true };
  },

  // Загрузка: временная ссылка для отправки файла прямо в хранилище.
  'POST uploads/url': async ({ user, body }) => {
    need(user);
    if (!TYPES[body.mime]) throw new HttpError(400, 'Можно загрузить JPG, PNG, WebP, PDF или DOCX');
    if (!(body.size > 0 && body.size <= MAX_SIZE)) throw new HttpError(400, 'Файл больше 20 МБ');
    const key = 'incoming/' + uid() + '.' + ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[body.mime] || 'docx');
    const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: body.mime }), { expiresIn: 900 });
    return { key, url };
  },

  // Описание загруженного файла → автоматическая проверка → публикация, очередь или отказ.
  'POST materials': async ({ user, body, iam }) => {
    need(user);
    if (!body.rights) throw new HttpError(400, 'Подтвердите, что вы автор или имеете право распространять материал');
    if (!/^incoming\/[0-9a-f-]+\.(jpg|png|webp|pdf|docx)$/.test(body.key || '')) throw new HttpError(400, 'Файл не найден');
    const head = await s3.send(new HeadObjectCommand({ Bucket: ENV.BUCKET, Key: body.key }));
    if (head.ContentLength > MAX_SIZE || !TYPES[head.ContentType]) throw new HttpError(400, 'Неподходящий файл');
    const item = {
      id: uid(), key: body.key, mime: head.ContentType, size: head.ContentLength,
      title: clean(body.title, 120), description: clean(body.description, 600),
      groups: (body.groups || []).filter((g) => GROUPS.includes(g)), seasons: (body.seasons || []).filter((s) => SEASONS.includes(s)),
      subjects: (body.subjects || []).map((s) => clean(s, 20)).slice(0, 5), tags: (body.tags || []).map((t) => clean(t, 40)).filter(Boolean).slice(0, 12),
      holidays: (body.holidays || []).map((h) => clean(h, 40)).slice(0, 5), type: clean(body.type, 20) || 'picture',
      width: Number(body.width) || null, height: Number(body.height) || null,
      authorId: user.id, authorName: clean(body.authorName, 60) || user.name, date: new Date().toISOString()
    };
    if (!item.title || !item.groups.length) throw new HttpError(400, 'Укажите название и возрастную группу');
    const buf = await readObject(body.key);
    const verdict = await moderate(iam, item, buf, user);
    if (verdict.status === 'rejected') {
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: body.key }));
      await logEvent('rejection', { materialTitle: item.title, authorId: user.id, authorName: item.authorName, reason: verdict.reason });
      return verdict;
    }
    item.status = verdict.status;
    item.reason = verdict.reason || null;
    await db.send(new PutCommand({ TableName: T.materials, Item: item }));
    if (verdict.status === 'published') await db.send(new UpdateCommand({ TableName: T.users, Key: { id: user.id }, UpdateExpression: 'SET published = if_not_exists(published, :z) + :one', ExpressionAttributeValues: { ':z': 0, ':one': 1 } }));
    return { status: item.status, reason: item.reason, id: item.id };
  },

  // Опубликованные материалы пользователей — для ленты.
  'GET materials': async () => {
    const r = await db.send(new ScanCommand({ TableName: T.materials, FilterExpression: '#s = :p', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':p': 'published' } }));
    return { items: await Promise.all((r.Items || []).map(publicView)) };
  },

  'GET me/materials': async ({ user }) => {
    need(user);
    const r = await db.send(new ScanCommand({ TableName: T.materials, FilterExpression: 'authorId = :a', ExpressionAttributeValues: { ':a': user.id } }));
    return { items: (r.Items || []).map((m) => ({ id: m.id, title: m.title, status: m.status, reason: m.reason, date: m.date })) };
  },

  // Жалоба: материал пользователя сразу скрывается до решения модератора.
  'POST complaints': async ({ user, body }) => {
    const id = clean(body.id, 80), reason = clean(body.reason, 200);
    if (!id) throw new HttpError(400, 'Нет материала');
    await logEvent('complaint', { materialId: id, materialTitle: clean(body.title, 120), reason, by: user ? user.id : 'гость' });
    const m = (await db.send(new GetCommand({ TableName: T.materials, Key: { id } }))).Item;
    if (m && m.status === 'published') await db.send(new UpdateCommand({ TableName: T.materials, Key: { id }, UpdateExpression: 'SET #s = :h, reason = :r', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':h': 'hidden', ':r': 'Жалоба: ' + reason } }));
    return { ok: true };
  },

  /* --- Администратор --- */
  'GET admin/queue': async ({ user }) => {
    need(user, true);
    const r = await db.send(new ScanCommand({ TableName: T.materials, FilterExpression: '#s = :p OR #s = :h', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':p': 'pending', ':h': 'hidden' } }));
    return { items: await Promise.all((r.Items || []).map(async (m) => Object.assign(await publicView(m), { status: m.status, reason: m.reason }))) };
  },
  'GET admin/events': async ({ user, query }) => {
    need(user, true);
    const r = await db.send(new ScanCommand({ TableName: T.events, FilterExpression: '#t = :t', ExpressionAttributeNames: { '#t': 'type' }, ExpressionAttributeValues: { ':t': query.type === 'complaint' ? 'complaint' : 'rejection' } }));
    return { items: (r.Items || []).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 300) };
  },
  'GET admin/all': async ({ user }) => {
    need(user, true);
    const r = await db.send(new ScanCommand({ TableName: T.materials }));
    return { items: (r.Items || []).map((m) => ({ id: m.id, title: m.title, status: m.status, author: m.authorName, date: m.date })) };
  },
  'POST admin/decide': async ({ user, body }) => {
    need(user, true);
    const m = (await db.send(new GetCommand({ TableName: T.materials, Key: { id: body.id } }))).Item;
    if (!m) throw new HttpError(404, 'Материал не найден');
    if (body.action === 'approve') {
      await db.send(new UpdateCommand({ TableName: T.materials, Key: { id: m.id }, UpdateExpression: 'SET #s = :p, reason = :n', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':p': 'published', ':n': null } }));
      if (m.status === 'pending') await db.send(new UpdateCommand({ TableName: T.users, Key: { id: m.authorId }, UpdateExpression: 'SET published = if_not_exists(published, :z) + :one', ExpressionAttributeValues: { ':z': 0, ':one': 1 } }));
    } else if (body.action === 'reject' || body.action === 'delete') {
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: m.key }));
      await db.send(new DeleteCommand({ TableName: T.materials, Key: { id: m.id } }));
      await logEvent('rejection', { materialTitle: m.title, authorId: m.authorId, authorName: m.authorName, reason: clean(body.reason, 200) || (body.action === 'delete' ? 'Удалено администратором' : 'Отклонено модератором') });
    } else throw new HttpError(400, 'Неизвестное действие');
    return { ok: true };
  },

  // Разделы меню: администратор может переопределить список из config.js.
  'GET settings/menu': async () => ((await db.send(new GetCommand({ TableName: T.settings, Key: { key: 'menu' } }))).Item || { value: null }),
  'PUT settings/menu': async ({ user, body }) => {
    need(user, true);
    if (!Array.isArray(body.value) || !body.value.every((m) => m && m.id && m.title)) throw new HttpError(400, 'Нужен список разделов { id, title, description, icon }');
    await db.send(new PutCommand({ TableName: T.settings, Item: { key: 'menu', value: body.value.map((m) => ({ id: clean(m.id, 30), title: clean(m.title, 60), description: clean(m.description, 120), icon: clean(m.icon, 20) })) } }));
    return { ok: true };
  },

  // Советник на YandexGPT: { prompt } → { text }.
  'POST ai/chat': async ({ body, iam }) => {
    if (!ENV.YC_FOLDER_ID) throw new HttpError(501, 'YandexGPT не подключён');
    const r = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + iam, 'x-folder-id': ENV.YC_FOLDER_ID },
      body: JSON.stringify({
        modelUri: 'gpt://' + ENV.YC_FOLDER_ID + '/' + (ENV.GPT_MODEL || 'yandexgpt-lite') + '/latest',
        completionOptions: { stream: false, temperature: 0.4, maxTokens: 2000 },
        messages: [
          { role: 'system', text: 'Ты — советник для воспитателей детского сада. Отвечай только на русском языке. Не давай медицинских и юридических заключений, не обсуждай политику.' },
          { role: 'user', text: clean(body.prompt, 12000) }
        ]
      })
    });
    if (!r.ok) throw new HttpError(502, 'YandexGPT не ответил');
    const j = await r.json();
    return { text: ((j.result && j.result.alternatives && j.result.alternatives[0] && j.result.alternatives[0].message) || {}).text || '' };
  }
};

/* ---------- Точка входа ---------- */
module.exports.handler = async function (event, context) {
  const headers = event.headers || {};
  const origin = headers.Origin || headers.origin || '';
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method === 'OPTIONS') return { statusCode: 204, headers: cors(origin), body: '' };
  const path = String((event.params && event.params.proxy) || (event.pathParams && event.pathParams.proxy) || String(event.url || '').split('?')[0] || event.path || '').replace(/^\/?(api\/)?/, '').replace(/\/$/, '');
  const fn = routes[method + ' ' + path];
  if (!fn) return reply(404, { error: 'Нет такого адреса API' }, origin);
  try {
    let body = {};
    if (event.body) body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
    const user = await currentUser(headers);
    const iam = context && context.token && context.token.access_token;
    const data = await fn({ body, user, iam, query: event.queryStringParameters || {} });
    return reply(200, data, origin);
  } catch (e) {
    console.error(e);
    return reply(e.status || 500, { error: e.status ? e.message : 'Ошибка сервера. Попробуйте позже.' }, origin);
  }
};

// Для setup.js
module.exports._tables = T;
