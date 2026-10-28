/*
 * Готовые шаблоны презентаций.
 *   audience — kids (для занятий с детьми) | pro (для коллег, педсоветов и выставок)
 *   bg, bg2, angle — фон: цвет или градиент; fg — текст; accent — акцент; soft — второстепенный текст
 *   font  — rounded (Comfortaa) | display (Unbounded) | serif (PT Serif) | sans (Nunito)
 *   deco  — рисунок на фоне: bubbles, stars, clouds, confetti, leaves, snow, flowers, rainbow, grid, frame,
 *           waves, blobs, lines, corners, dots, bar, geo, sprig, swiss, none (см. assets/js/ui/templates.js)
 *   align — выравнивание титульного слайда: center | left
 */
window.SITE_DATA = window.SITE_DATA || {};
window.SITE_DATA.templates = [
  { id: 'kids-ocean', name: 'Подводный мир', audience: 'kids', bg: '#0e3a5c', bg2: '#0a7e8c', angle: 160, fg: '#ffffff', accent: '#ffd27a', soft: '#cdeff5', font: 'rounded', deco: 'bubbles', align: 'center' },
  { id: 'kids-space', name: 'Космическое путешествие', audience: 'kids', bg: '#120a2e', bg2: '#3a1c71', angle: 135, fg: '#ffffff', accent: '#ffd27a', soft: '#d8c7f3', font: 'display', deco: 'stars', align: 'center' },
  { id: 'kids-sky', name: 'Облака', audience: 'kids', bg: '#9fd8ff', bg2: '#eaf6ff', angle: 180, fg: '#1d3557', accent: '#e85d75', soft: '#3d5a80', font: 'rounded', deco: 'clouds', align: 'center' },
  { id: 'kids-party', name: 'Праздник', audience: 'kids', bg: '#fffaf0', bg2: null, angle: 0, fg: '#3d2c5c', accent: '#e63972', soft: '#6b5a87', font: 'rounded', deco: 'confetti', align: 'center' },
  { id: 'kids-autumn', name: 'Осенний лес', audience: 'kids', bg: '#fff4e0', bg2: '#ffdcae', angle: 160, fg: '#5a2e0e', accent: '#d9480f', soft: '#7f4f24', font: 'rounded', deco: 'leaves', align: 'center' },
  { id: 'kids-winter', name: 'Снежная зима', audience: 'kids', bg: '#d4ecff', bg2: '#f7fbff', angle: 180, fg: '#1c3d6e', accent: '#2f6fd6', soft: '#3f5f8f', font: 'rounded', deco: 'snow', align: 'center' },
  { id: 'kids-spring', name: 'Весенний луг', audience: 'kids', bg: '#f2fff0', bg2: '#d6f5c6', angle: 180, fg: '#234d20', accent: '#d6336c', soft: '#3f6b3a', font: 'rounded', deco: 'flowers', align: 'center' },
  { id: 'kids-rainbow', name: 'Радуга', audience: 'kids', bg: '#ffffff', bg2: '#fff6fb', angle: 180, fg: '#2b2540', accent: '#7b2cbf', soft: '#5d5574', font: 'display', deco: 'rainbow', align: 'left' },
  { id: 'kids-notebook', name: 'Тетрадь в клетку', audience: 'kids', bg: '#fdfdf8', bg2: null, angle: 0, fg: '#1f2a44', accent: '#c92a2a', soft: '#4a5878', font: 'sans', deco: 'grid', align: 'left' },
  { id: 'kids-fairy', name: 'Сказка', audience: 'kids', bg: '#2d1650', bg2: '#5b2a86', angle: 135, fg: '#fff3e0', accent: '#ffcf56', soft: '#e7d3ff', font: 'serif', deco: 'frame', align: 'center' },
  { id: 'kids-waves', name: 'Морские волны', audience: 'kids', bg: '#e0f7fa', bg2: '#c7eef3', angle: 180, fg: '#014f63', accent: '#007f8c', soft: '#2a6f7d', font: 'rounded', deco: 'waves', align: 'center' },
  { id: 'kids-blobs', name: 'Цветные пятна', audience: 'kids', bg: '#fff8f0', bg2: null, angle: 0, fg: '#2b2540', accent: '#e8590c', soft: '#5d5574', font: 'rounded', deco: 'blobs', align: 'center' },
  { id: 'pro-navy', name: 'Строгий синий', audience: 'pro', bg: '#0b2545', bg2: '#13315c', angle: 135, fg: '#ffffff', accent: '#8da9c4', soft: '#c9d6e3', font: 'sans', deco: 'lines', align: 'left' },
  { id: 'pro-white', name: 'Минимализм', audience: 'pro', bg: '#ffffff', bg2: null, angle: 0, fg: '#1b1b1b', accent: '#693c85', soft: '#555555', font: 'sans', deco: 'corners', align: 'left' },
  { id: 'pro-graphite', name: 'Графит', audience: 'pro', bg: '#1e1f24', bg2: '#2b2d33', angle: 135, fg: '#f2f2f2', accent: '#4ecdc4', soft: '#b8bcc6', font: 'sans', deco: 'dots', align: 'left' },
  { id: 'pro-method', name: 'Методическое объединение', audience: 'pro', bg: '#faf7f0', bg2: null, angle: 0, fg: '#2b2540', accent: '#498757', soft: '#5d5574', font: 'serif', deco: 'bar', align: 'left' },
  { id: 'pro-expo', name: 'Выставочный', audience: 'pro', bg: '#3a0f5c', bg2: '#693c85', angle: 120, fg: '#ffffff', accent: '#9be15d', soft: '#e3d3f2', font: 'display', deco: 'geo', align: 'left' },
  { id: 'pro-eco', name: 'Эко', audience: 'pro', bg: '#f3f7f2', bg2: null, angle: 0, fg: '#1d3b2a', accent: '#498757', soft: '#47604f', font: 'serif', deco: 'sprig', align: 'left' },
  { id: 'pro-swiss', name: 'Швейцарский стиль', audience: 'pro', bg: '#f4f1ec', bg2: null, angle: 0, fg: '#111111', accent: '#d62839', soft: '#444444', font: 'sans', deco: 'swiss', align: 'left' },
  { id: 'pro-brand', name: "Ocean learnin' stars", audience: 'pro', bg: '#0a0d26', bg2: '#10183d', angle: 160, fg: '#f1efff', accent: '#7fe3d4', soft: '#c3c6e8', font: 'display', deco: 'stars', align: 'left' }
];
