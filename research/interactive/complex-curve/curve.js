'use strict';

// Analytic derivatives with beta held constant. Kept independent of the UI.
function curve(r, beta) {
  const a = Math.exp(-2 * beta);
  const q = 1 - r;
  const n = r ** 3 + a * r * (1 - r ** 2);
  const d = q ** 3 + r ** 3 + 3 * a * r * q;
  const np = 3 * r ** 2 + a * (1 - 3 * r ** 2);
  const npp = 6 * r * (1 - a);
  const dp = 3 * (a - 1) * (1 - 2 * r);
  const dpp = 6 * (1 - a);
  return { y: n / d, d1: np / d - n * dp / d ** 2, d2: npp / d - (2 * np * dp + n * dpp) / d ** 2 + 2 * n * dp ** 2 / d ** 3 };
}

const betaSlider = document.getElementById('beta');
const betaNumber = document.getElementById('beta-number');
const rSlider = document.getElementById('r');
const format = value => Math.abs(value) < 1e-10 ? '0' : (Math.abs(value) >= 10000 || Math.abs(value) < .001 ? value.toExponential(2) : Number(value.toPrecision(5)).toString());
let beta = 0;
let samples = [];
const ns = 'http://www.w3.org/2000/svg';
function element(name, attributes, text) {
  const node = document.createElementNS(ns, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function plot(id, key, min, max, color, r) {
  const svg = document.getElementById(id);
  svg.replaceChildren();
  const left = 80, top = 22, width = 518, height = 310;
  const x = r => left + r * width;
  const y = value => top + (max - value) / (max - min) * height;
  for (let i = 0; i <= 4; i++) {
    const value = min + (max - min) * i / 4;
    svg.append(element('line', {x1: left, x2: left + width, y1: y(value), y2: y(value), stroke: '#e8edf4'}));
    svg.append(element('text', {x: left - 10, y: y(value) + 4, 'text-anchor': 'end'}, format(value)));
    const rx = i / 4;
    svg.append(element('text', {x: x(rx), y: top + height + 25, 'text-anchor': 'middle'}, rx.toFixed(2)));
  }
  svg.append(element('line', {x1: left, x2: left + width, y1: y(0), y2: y(0), stroke: '#a8b6ca', 'stroke-dasharray': '4 4'}));
  if (key === 'y') svg.append(element('line', {x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: '#a8b6ca', 'stroke-dasharray': '5 5'}));
  const path = samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.r).toFixed(3)},${y(s[key]).toFixed(3)}`).join(' ');
  svg.append(element('path', {d: path, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round'}));
  svg.append(element('line', {x1: x(r), x2: x(r), y1: top, y2: top + height, stroke: '#a8b6ca', 'stroke-dasharray': '3 4'}));
  svg.append(element('circle', {cx: x(r), cy: y(curve(r, beta)[key]), r: 5, fill: color, stroke: 'white', 'stroke-width': 2}));
  svg.append(element('text', {x: left + width / 2, y: 382, 'text-anchor': 'middle'}, 'r'));
}
function render(resample = true) {
  const r = Number(rSlider.value);
  if (resample) {
    // Cosine spacing resolves narrow endpoint features at negative beta.
    samples = Array.from({length: 2401}, (_, i) => {
      const r = (1 - Math.cos(Math.PI * i / 2400)) / 2;
      return {r, ...curve(r, beta)};
    });
  }
  let limit = Math.max(...samples.map(s => Math.abs(s.d2)));
  limit = limit < 1e-9 ? 1 : limit * 1.08;
  plot('function-plot', 'y', -.05, 1.05, '#315dd5', r);
  const slopes = samples.map(s => s.d1);
  const slopeMin = Math.min(0, ...slopes);
  const slopeMax = Math.max(1, ...slopes);
  const padding = (slopeMax - slopeMin) * .08;
  plot('first-derivative-plot', 'd1', slopeMin - padding, slopeMax + padding, '#148074', r);
  plot('derivative-plot', 'd2', -limit, limit, '#cf632a', r);
  const current = curve(r, beta);
  document.getElementById('r-value').value = r.toFixed(3);
  document.getElementById('y-value').value = `y = ${format(current.y)}`;
  document.getElementById('d1-value').value = `y′ = ${format(current.d1)}`;
  document.getElementById('d2-value').value = `y″ = ${format(current.d2)}`;
}
function setBeta(value) {
  if (!Number.isFinite(value) || value < -3 || value > 6) {
    document.getElementById('beta-error').textContent = 'β는 −3부터 6 사이로 입력해주세요.';
    betaNumber.setAttribute('aria-invalid', 'true');
    return;
  }
  beta = value;
  betaSlider.value = value;
  betaNumber.value = value;
  betaNumber.removeAttribute('aria-invalid');
  document.getElementById('beta-error').textContent = '';
  render();
}
betaSlider.addEventListener('input', () => setBeta(Number(betaSlider.value)));
betaNumber.addEventListener('input', () => setBeta(betaNumber.value === '' ? NaN : Number(betaNumber.value)));
rSlider.addEventListener('input', () => render(false));
for (const button of document.querySelectorAll('[data-beta]')) button.addEventListener('click', () => setBeta(Number(button.dataset.beta)));
render();
