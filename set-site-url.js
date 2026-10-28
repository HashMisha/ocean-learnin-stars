// Подставляет настоящий адрес сайта в index.html, robots.txt и sitemap.xml.
// Запуск: node set-site-url.js https://ваш-логин.github.io/ocean-learnin-stars/
const fs = require('fs');

let url = process.argv[2];
if (!url || !/^https:\/\//.test(url)) {
  console.error('Укажите адрес, начинающийся с https://, например:\n  node set-site-url.js https://ivanova.github.io/ocean-learnin-stars/');
  process.exit(1);
}
if (!url.endsWith('/')) url += '/';

const files = ['index.html', 'robots.txt', 'sitemap.xml'];
// Заменяем и заготовку, и адрес, подставленный раньше (можно запускать повторно).
const current = (fs.readFileSync('index.html', 'utf8').match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
files.forEach((f) => {
  let text = fs.readFileSync(f, 'utf8');
  if (current) text = text.split(current).join(url);
  fs.writeFileSync(f, text);
});
const lastmod = new Date().toISOString().slice(0, 10);
const sm = fs.readFileSync('sitemap.xml', 'utf8').replace(/\s*<lastmod>[^<]*<\/lastmod>/, '').replace('</loc>', '</loc>\n    <lastmod>' + lastmod + '</lastmod>');
fs.writeFileSync('sitemap.xml', sm);
console.log('Адрес сайта: ' + url + '\nОбновлены: ' + files.join(', '));
