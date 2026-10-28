// Собирает artifact.html — один файл со встроенными стилями, скриптами и данными для публикации в claude.ai.
// Запуск: node build-artifact.js
const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8')
  .replace(/^<!doctype html>\n|^<\/?html[^>]*>\n|^<\/?head>\n|^<\/?body>\n|^<meta charset="utf-8">\n|^<meta name="viewport"[^\n]*\n/gim, '')
  .replace(/<!-- seo[\s\S]*?<!-- \/seo -->\n/, ''); // SEO-разметка нужна только на собственном хостинге
html = html.replace(/<link rel="stylesheet" href="(assets\/[^"]+)">/g, (m, p) => '<style>\n' + fs.readFileSync(p, 'utf8') + '\n</style>');
html = html.replace(/<script src="((?:assets|data)\/[^"]+)"><\/script>/g, (m, p) => '<script>\n' + fs.readFileSync(p, 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
fs.writeFileSync('artifact.html', html);
console.log('artifact.html: ' + Math.round(html.length / 1024) + ' КБ');
