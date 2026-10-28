/*
 * Генерация картинок нейросетью.
 *   horde        — AI Horde (aihorde.net): бесплатная сеть добровольцев, модели SDXL, анонимный ключ; основной вариант.
 *                  Личный бесплатный ключ с aihorde.net (App.config.imageAI.hordeKey) ускоряет очередь.
 *   pollinations — Pollinations.ai: бесплатно, но в часы нагрузки вместо картинки отдаёт заглушку.
 *   http         — свой сервер с любой (в т. ч. платной) моделью: POST endpoint → картинка или { url }.
 * Запрос переводится на английский (App.sources.translate) — модели понимают его точнее.
 */
(function () {
  'use strict';
  const App = window.App;
  const CFG = App.config.imageAI;

  const STYLES = {
    cartoon: { label: 'Мультяшный', suffix: 'cute cartoon illustration for preschool children, bright friendly colors, simple shapes' },
    coloring: { label: 'Раскраска', suffix: 'black and white line art coloring page for kids, thick clean outlines, white background, no shading, no gray' },
    watercolor: { label: 'Акварель', suffix: 'soft watercolor children book illustration, pastel colors, white paper texture' },
    poster: { label: 'Плакат', suffix: 'flat vector educational poster illustration, clean shapes, limited palette' },
    pixel: { label: 'Пиксель-арт', suffix: 'pixel art, 16-bit game style, vibrant colors' },
    photo: { label: 'Как фото', suffix: 'realistic photo, natural light, high detail' }
  };
  // Стороны кратны 64 — так требуют модели Stable Diffusion.
  const SIZES = {
    square: { label: 'Квадрат', w: 768, h: 768 },
    portrait: { label: 'A4 книжный', w: 640, h: 896 },
    landscape: { label: 'Для слайда 16:9', w: 896, h: 512 }
  };
  const SAFE = 'safe for children, wholesome, no text, no letters, no watermark';
  const NEGATIVE = 'nsfw, nude, violence, blood, scary, horror, text, watermark, signature, deformed, extra fingers';
  // Только «чистые» универсальные модели: в сети Horde есть и модели для взрослых.
  const HORDE_MODELS = ['AlbedoBase XL (SDXL)', 'Juggernaut XL', 'Deliberate', 'stable_diffusion'];

  function fullPrompt(prompt, style) {
    return prompt.trim() + '. ' + (STYLES[style] || STYLES.cartoon).suffix + ', ' + SAFE;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // AI Horde: ставим задание в очередь и опрашиваем, пока картинка не будет готова.
  async function horde(prompt, s, seed, onProgress) {
    const headers = { 'Content-Type': 'application/json', apikey: CFG.hordeKey || '0000000000', 'Client-Agent': 'ocean-learnin-stars:1.0:github' };
    const r = await fetch('https://aihorde.net/api/v2/generate/async', {
      method: 'POST', headers,
      body: JSON.stringify({
        prompt: prompt + ' ### ' + NEGATIVE,
        params: { width: s.w, height: s.h, steps: 24, cfg_scale: 6.5, sampler_name: 'k_euler_a', karras: true, seed: String(seed), n: 1 },
        nsfw: false, censor_nsfw: true, r2: true, slow_workers: true, models: HORDE_MODELS
      })
    });
    const job = await r.json();
    if (!job.id) throw new Error(job.message || 'Сервис картинок не принял запрос.');
    const started = Date.now();
    while (Date.now() - started < 300000) {
      await sleep(3000);
      const c = await (await fetch('https://aihorde.net/api/v2/generate/check/' + job.id)).json();
      if (c.faulted) throw new Error('Нейросеть не справилась с запросом. Попробуйте переформулировать.');
      if (onProgress) onProgress(c.done ? 'Почти готово…' : c.queue_position > 0 ? 'Очередь: ' + c.queue_position + ', около ' + Math.max(5, c.wait_time) + ' с' : 'Рисуем, около ' + Math.max(3, c.wait_time) + ' с…');
      if (c.done) {
        const st = await (await fetch('https://aihorde.net/api/v2/generate/status/' + job.id)).json();
        const g = (st.generations || [])[0];
        if (!g || g.censored) throw new Error('Картинка не прошла фильтр безопасности. Измените запрос.');
        return { url: g.img, model: g.model };
      }
    }
    fetch('https://aihorde.net/api/v2/generate/status/' + job.id, { method: 'DELETE' }).catch(() => {});
    throw new Error('Очередь слишком длинная. Попробуйте позже.');
  }

  function pollinationsUrl(prompt, style, s, seed) {
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(fullPrompt(prompt, style)) +
      '?width=' + s.w + '&height=' + s.h + '&seed=' + seed + '&model=' + encodeURIComponent(CFG.model || 'flux') + '&nologo=true';
  }

  // Pollinations отвечает 403 на CORS-запросы из браузера, поэтому показываем без crossOrigin.
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Нейросеть не ответила. Попробуйте ещё раз через минуту.'));
      img.src = src;
    });
  }

  // Возвращает { url, w, h, prompt, style, seed, credit }. onProgress(text) — статус ожидания.
  async function generate(prompt, opts) {
    const o = opts || {};
    const style = o.style || 'cartoon', size = o.size || 'square';
    const seed = o.seed || Math.floor(Math.random() * 1e9);
    const s = SIZES[size] || SIZES.square;
    const en = await App.sources.translate(prompt);
    let url, credit;
    if (CFG.provider === 'http' && CFG.endpoint) {
      const r = await fetch(CFG.endpoint, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, CFG.headers),
        body: JSON.stringify({ prompt: fullPrompt(en, style), width: s.w, height: s.h, seed })
      });
      if (!r.ok) throw new Error('Сервис картинок недоступен (код ' + r.status + ').');
      const type = r.headers.get('content-type') || '';
      url = type.startsWith('image/') ? URL.createObjectURL(await r.blob()) : (await r.json()).url;
      credit = 'Сгенерировано нейросетью';
    } else if (CFG.provider === 'pollinations') {
      url = pollinationsUrl(en, style, s, seed);
      credit = 'Сгенерировано нейросетью Pollinations.ai';
    } else {
      const res = await horde(fullPrompt(en, style), s, seed, o.onProgress);
      url = res.url;
      credit = 'Сгенерировано нейросетью (AI Horde, ' + res.model + ')';
    }
    await loadImage(url);
    return { url, w: s.w, h: s.h, prompt, style, size, seed, credit };
  }

  // Файл картинки, если источник разрешает чтение (свой сервер, blob:). Иначе — ошибка с code 'cors'.
  async function toBlob(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.blob();
    } catch (e) {
      const err = new Error('Сервис не разрешает скачивание из браузера');
      err.code = 'cors';
      throw err;
    }
  }

  // Скачать картинку; если сервис не разрешает — открыть её в новой вкладке, откуда её можно сохранить.
  async function save(url, name) {
    try {
      const blob = await toBlob(url);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + (blob.type === 'image/png' ? '.png' : '.jpg');
      document.body.append(a);
      a.click();
      a.remove();
      return 'saved';
    } catch (e) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.append(a);
      a.click();
      a.remove();
      return 'opened';
    }
  }

  // Для презентаций: картинку сохраняем внутрь (data:), потому что ссылки AI Horde временные.
  async function toDataUrl(url) {
    try {
      const blob = await toBlob(url);
      return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    } catch (e) { return url; }
  }

  const available = () => !App.storage.inArtifact();

  App.imageGen = { STYLES, SIZES, generate, toBlob, toDataUrl, save, available };
})();
