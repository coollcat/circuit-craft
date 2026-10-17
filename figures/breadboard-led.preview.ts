// 离线预览构建入口：node figures/build.mjs breadboard-led [--light]
// 产出 figures/out/breadboard-led.html（自带 kit 运行时，双击即可看）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as k from '../src/features/figures/kit/iso-kit';
import { buildParts, HEIGHT, LED_POS, LED_Z, P, WIDTH } from '../src/features/figures/breadboard-led/geometry';
import { needlePath, pointerPath, RUNTIME_GEOMETRY } from '../src/features/figures/breadboard-led/parts';
import {
  BURN_FACTOR, BURN_SECONDS, DIGIT_WEIGHTS, LED_IMAX, LED_RON, LED_VF, METER_FS, NEEDLE_SWEEP,
  SUPPLY_V, operatingPoint, resistanceOf,
} from '../src/features/figures/breadboard-led/model';
import { kitScript } from './inline-kit.mjs';

// 输出目录由 build.mjs 通过 FIG_OUT 传入（打包后 import.meta.url 指向 .tmp-build，不能据此定位）
const OUT = process.env.FIG_OUT ?? join(process.cwd(), 'figures', 'out');
mkdirSync(OUT, { recursive: true });
const theme = process.argv.includes('--light') ? 'light' : 'dark';

const parts = buildParts();
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: parts.label, body: parts.body });

/** 把纯函数源码内联进页面：模型与路径生成只有一份实现（TS 源），预览不会漂移 */
const src = (fn: unknown) => (fn as { toString(): string }).toString();

const live = `
const GEO = ${JSON.stringify(RUNTIME_GEOMETRY)};
const DIAL_POS = ${JSON.stringify(parts.runtime.dials.map(d => [d.x, d.y]))};
const INITIAL = ${JSON.stringify(parts.runtime.initial)};
const SUPPLY_V = ${SUPPLY_V}, LED_VF = ${LED_VF}, LED_RON = ${LED_RON}, LED_IMAX = ${LED_IMAX};
const BURN_FACTOR = ${BURN_FACTOR}, BURN_SECONDS = ${BURN_SECONDS}, METER_FS = ${METER_FS};
const DIGIT_WEIGHTS = ${JSON.stringify(DIGIT_WEIGHTS)};
const PROJECTION = ${JSON.stringify(P)};

const resistanceOf = ${src(resistanceOf)};
const operatingPoint = ${src(operatingPoint)};
const pointerPath = ${src(pointerPath)};
const needlePath = ${src(needlePath)};

const stage = document.querySelector('.iso-stage');
const svg = stage.querySelector('svg');
const needle = svg.querySelector('[data-part="needle"] path') || svg.querySelector('[data-part="needle"]');
const glow = svg.querySelector('[data-part="led-glow"]');
const soot = svg.querySelector('[data-part="led-soot"]');
const dome = svg.querySelector('[data-part="led-dome"]');
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const line = (a, b, z) => lineOnTop(a, b, z, PROJECTION);

let digits = INITIAL.slice();
let burned = false, lethalTime = 0, shown = 0, shownNeedle = 0, target = 0;
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0, selected = 1;

const toScreen = (x, y, z) => iso([x, y, z], PROJECTION);
const dialCenters = DIAL_POS.map(([x, y]) => toScreen(x, y, GEO.dialTop));
const op = () => operatingPoint(digits, burned);
const dialPath = (index) => pointerPath(DIAL_POS[index][0], DIAL_POS[index][1], digits[index], GEO.dialR, GEO.dialTop, line, PROJECTION);
const needleP = (value) => needlePath(value, GEO.meter[0], GEO.meter[1], GEO.needleLen, GEO.meterFace, line, PROJECTION);

function draw() {
  DIAL_POS.forEach((_, index) => {
    const group = svg.querySelector('[data-part="dial-' + index + '"] path') || svg.querySelector('[data-part="dial-' + index + '"]');
    if (group) group.setAttribute('d', dialPath(index));
  });
  if (needle) needle.setAttribute('d', needleP(shownNeedle));
  const point = op();
  if (glow) glow.setAttribute('opacity', String(0.1 + 0.9 * shown));
  if (dome) dome.style.filter = burned ? 'grayscale(1) brightness(0.4)' : '';
  if (soot) soot.setAttribute('opacity', burned ? '0.55' : '0');
  const text = 'R = ' + point.r + ' Ω · I = ' + (point.i * 1000).toFixed(1) + ' mA · ' + point.verdict;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute('aria-valuenow', String(point.r));
  stage.setAttribute('aria-valuetext', text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const sweep = [470, 1000, 220, 4700];
    const want = sweep[Math.floor(clock / 3.2) % sweep.length];
    digits = DIGIT_WEIGHTS.map((weight, index) => Math.floor(want / weight) % 10);
  }
  const point = op();
  if (point.lethal) {
    lethalTime += dt;
    if (lethalTime >= BURN_SECONDS) { burned = true; lethalTime = 0; }
  } else lethalTime = Math.max(0, lethalTime - dt * 2);
  target = op().glow;
  const goal = op().needle;
  shown = calm ? target : shown + (target - shown) * (1 - Math.exp(-dt / 0.12));
  shownNeedle = calm ? goal : shownNeedle + (goal - shownNeedle) * (1 - Math.exp(-dt / 0.16));
  draw();
  // 注意：烧灯计时靠每帧累加 dt，所以「过流待烧」期间绝不能停循环——
  // 开启减动效时数值会瞬间到位，若按"动画是否收敛"停循环，1A 短路将永远不会烧灯。
  const settled = !touring && lethalTime <= 0 && Math.abs(target - shown) < 0.002 && Math.abs(goal - shownNeedle) < 0.002;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}

const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const stopTour = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run(); };

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) { if (still.matches) touring = false; run(); }
}, { rootMargin: '120px 0px' }).observe(stage);

let dragging = false, dragStartY = 0, dragStartDigit = 0, dragDial = 0;
// 视口坐标 → SVG 用户坐标。SVG 按 viewBox 缩放显示，不换算的话命中半径会整体错位：
// 渲染宽度 ≠ 760 时拨盘拖不动、LED 也点不中（这条交互自查就是靠驱动页面才发现的）。
const toUser = (event) => {
  const box = svg.getBoundingClientRect();
  const scale = box.width / ${WIDTH};
  return [(event.clientX - box.left) / scale, (event.clientY - box.top) / scale];
};
const LED_AT = ${JSON.stringify(LED_POS)};
const dialAt = (event) => {
  const [x, y] = toUser(event);
  for (let i = 0; i < dialCenters.length; i++) {
    if (Math.hypot(x - dialCenters[i][0], y - dialCenters[i][1]) < 26) return i;
  }
  return -1;
};
stage.addEventListener('pointerdown', (event) => {
  const index = dialAt(event);
  if (index < 0) {
    // 点 LED 附近 = 换一颗新灯（坐标取自几何常量，避免两处各写一份而漂移）
    const [ux, uy] = toUser(event);
    const led = toScreen(LED_AT[0], LED_AT[1], ${LED_Z});
    if (Math.hypot(ux - led[0], uy - led[1]) < 30) {
      burned = false; lethalTime = 0; stopTour(); draw();
    }
    return;
  }
  stopTour();
  dragging = true; dragDial = index; selected = index;
  dragStartY = event.clientY; dragStartDigit = digits[index];
  // 合成事件（自动化测试/部分浏览器）没有活跃指针，setPointerCapture 会抛 NotFoundError；
  // 拖拽状态已经设好，捕获失败不影响交互，所以这里吞掉异常。
  try { stage.setPointerCapture(event.pointerId); } catch { /* 无活跃指针 */ }
});
stage.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const step = Math.round((dragStartY - event.clientY) / 9);
  digits[dragDial] = Math.max(0, Math.min(9, dragStartDigit + step));
  run();
});
const endDrag = () => { dragging = false; };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('keydown', (event) => {
  let used = true;
  if (event.key === 'ArrowLeft') selected = (selected + DIAL_POS.length - 1) % DIAL_POS.length;
  else if (event.key === 'ArrowRight') selected = (selected + 1) % DIAL_POS.length;
  else if (event.key === 'ArrowUp') digits[selected] = Math.min(9, digits[selected] + 1);
  else if (event.key === 'ArrowDown') digits[selected] = Math.max(0, digits[selected] - 1);
  else if (event.key === 'Home') digits[selected] = 0;
  else if (event.key === 'End') digits[selected] = 9;
  else if (event.key === 'r' || event.key === 'R') { burned = false; lethalTime = 0; }
  else used = false;
  if (!used) return;
  event.preventDefault();
  stopTour();
  draw();
});

draw();

// 自动化测试钩子（只读 + 事件派发；离线预览专用，站点组件没有这个）
window.__fig = {
  readout: () => readout.textContent,
  digits: () => digits.slice(),
  op: () => op(),
  dialCenters: () => dialCenters,
  ledScreen: () => toScreen(LED_AT[0], LED_AT[1], ${LED_Z}),
  burned: () => burned,
  glow: () => Number(glow ? glow.getAttribute('opacity') : 0),
  pointer: (type, x, y) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true })),
  key: (k) => stage.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })),
  svgBox: () => { const b = svg.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; },
};
`;

const body = k.plateHtml({
  fig: 'Fig 1',
  title: '面包板 · LED 限流电路',
  hint: parts.hint,
  readout: `R = ${parts.runtime.initialR} Ω · I = 14.7 mA · 正常点亮`,
  keys: parts.keys,
  caption: parts.caption,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="面包板 LED 限流电路：拖动或方向键拨动电阻箱，看电流与 LED 亮度" aria-valuemin="0" aria-valuemax="9999" aria-valuenow="${parts.runtime.initialR}">${svg}</div>`,
});

const html = k.pageHtml({ title: '面包板 LED 限流电路', theme, body, script: kitScript() + live });
const file = join(OUT, theme === 'light' ? 'breadboard-led-light.html' : 'breadboard-led.html');
writeFileSync(file, html);
console.log('wrote', file);
