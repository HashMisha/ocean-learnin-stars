/*
 * Текстовая нейросеть-помощник (конструктор презентаций).
 * Порядок: Claude (если сайт открыт артефактом claude.ai) → свой сервер (App.config.textAI.endpoint)
 * → AI Horde (бесплатно, модель Gemma; ответ обычно за 20–60 секунд).
 */
(function () {
  'use strict';
  const App = window.App;
  const CFG = App.config.textAI;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let claude = null;

  async function viaClaude(prompt) {
    if (!(window.claude && typeof window.claude.use === 'function')) return null;
    if (!claude) claude = window.claude.use('sample').catch(() => null);
    const api = await claude;
    if (!api) return null;
    const r = await api(prompt, { modelTier: 'quick', cache: false });
    return r.text;
  }

  async function viaHttp(prompt) {
    const r = await fetch(CFG.endpoint, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, CFG.headers || {}),
      body: JSON.stringify({ prompt })
    });
    if (!r.ok) throw new Error('Помощник недоступен (код ' + r.status + ').');
    const j = await r.json();
    return j.text || j.answer || '';
  }

  async function viaHorde(prompt, maxTokens, onProgress) {
    const headers = { 'Content-Type': 'application/json', apikey: CFG.hordeKey || '0000000000', 'Client-Agent': 'ocean-learnin-stars:1.0:github' };
    const r = await fetch('https://aihorde.net/api/v2/generate/text/async', {
      method: 'POST', headers,
      body: JSON.stringify({
        prompt: '<start_of_turn>user\n' + prompt + '<end_of_turn>\n<start_of_turn>model\n',
        models: CFG.hordeModels,
        params: { max_length: Math.min(512, maxTokens || 400), max_context_length: 4096, temperature: 0.5, stop_sequence: ['<end_of_turn>', '<start_of_turn>'] }
      })
    });
    const job = await r.json();
    if (!job.id) throw new Error(job.message || 'Помощник не принял запрос.');
    const t0 = Date.now();
    while (Date.now() - t0 < 180000) {
      await sleep(3000);
      const s = await (await fetch('https://aihorde.net/api/v2/generate/text/status/' + job.id)).json();
      if (s.faulted) throw new Error('Помощник не справился. Попробуйте ещё раз.');
      if (onProgress) onProgress(s.done ? 'Почти готово…' : s.queue_position > 0 ? 'В очереди: ' + s.queue_position : 'Помощник пишет…');
      if (s.done) return ((s.generations || [])[0] || {}).text || '';
    }
    fetch('https://aihorde.net/api/v2/generate/text/status/' + job.id, { method: 'DELETE' }).catch(() => {});
    throw new Error('Помощник долго не отвечает. Попробуйте позже.');
  }

  function tidy(text) {
    let t = String(text || '');
    const fin = t.match(/assistantfinal([\s\S]*)$/i); // некоторые модели пишут рассуждения перед ответом
    if (fin) t = fin[1];
    return t.replace(/<\/?(start|end)_of_turn>|^model\n/g, '').trim();
  }
  // Ответ годится: по-русски и без «рассуждений вслух» на английском.
  const looksOk = (t) => /[а-яё]/i.test(t) && !/^(we need|the user|user asks|let'?s|okay|ok,|i need|analysis)/i.test(t);

  // Ответ — обычный текст без служебных меток. validate(text) — своя проверка формата.
  // В сети AI Horde запрос может попасть к разным добровольным серверам, поэтому неудачный ответ повторяем.
  async function ask(prompt, opts) {
    const o = opts || {};
    let text = null;
    try { text = await viaClaude(prompt); } catch (e) { text = null; }
    if (text == null && CFG.endpoint) text = await viaHttp(prompt);
    if (text != null) return tidy(text);
    if (App.storage.inArtifact()) throw new Error('Помощник недоступен в этом окне.');
    const strict = 'Отвечай сразу готовым результатом по-русски, без рассуждений и пояснений.\n' + prompt;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1 && o.onProgress) o.onProgress('Ответ получился неудачным, спрашиваем ещё раз (' + attempt + '/3)…');
      const t = tidy(await viaHorde(strict, o.maxTokens, o.onProgress));
      if (looksOk(t) && (!o.validate || o.validate(t))) return t;
    }
    throw new Error('Помощник ответил невнятно. Попробуйте ещё раз или переформулируйте просьбу.');
  }

  App.textGen = { ask };
})();
