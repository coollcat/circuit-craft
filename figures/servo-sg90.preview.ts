// 离线预览构建入口：node figures/build.mjs servo-sg90 [--light]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as k from '../src/features/figures/kit/iso-kit';
import { buildParts, HEIGHT, WIDTH } from '../src/features/figures/servo-sg90/geometry';
import { hornArmPath, hornHoles, knobPointerPath, pwmPath, RUNTIME_GEOMETRY } from '../src/features/figures/servo-sg90/parts';
import {
  ANGLE_SPAN, IDLE_CURRENT_A, MOVE_CURRENT_A, PERIOD_MS, PWM_FREQ_HZ, PULSE_KNOB_MAX_MS, PULSE_KNOB_MIN_MS,
  PULSE_MAX_MS, PULSE_MIN_MS, PULSE_STEP_MS, SPEED_S_PER_60DEG, STALL_CURRENT_A, STALL_TORQUE_KGCM,
  angleOf, clampPulse, servoState,
} from '../src/features/figures/servo-sg90/model';
import { P } from '../src/features/figures/servo-sg90/scene';
import { kitScript } from './inline-kit.mjs';

const OUT = process.env.FIG_OUT ?? join(process.cwd(), 'figures', 'out');
mkdirSync(OUT, { recursive: true });
const theme = process.argv.includes('--light') ? 'light' : 'dark';

const parts = buildParts();
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: parts.label, body: parts.body });
const src = (fn: unknown) => (fn as { toString(): string }).toString();

const live = `
const GEO = ${JSON.stringify(RUNTIME_GEOMETRY)};
const PROJECTION = ${JSON.stringify(P)};
const KNOB_SCREEN = ${JSON.stringify(parts.runtime.knobScreen)};
// 内联的纯函数直接引用模块常量，所以这里必须用**原名**声明（别改成短名）
const PWM_FREQ_HZ = ${PWM_FREQ_HZ}, PERIOD_MS = ${PERIOD_MS};
const PULSE_MIN_MS = ${PULSE_MIN_MS}, PULSE_MAX_MS = ${PULSE_MAX_MS}, ANGLE_SPAN = ${ANGLE_SPAN};
const PULSE_KNOB_MIN_MS = ${PULSE_KNOB_MIN_MS}, PULSE_KNOB_MAX_MS = ${PULSE_KNOB_MAX_MS}, PULSE_STEP_MS = ${PULSE_STEP_MS};
const STALL_CURRENT_A = ${STALL_CURRENT_A}, MOVE_CURRENT_A = ${MOVE_CURRENT_A}, IDLE_CURRENT_A = ${IDLE_CURRENT_A};
const STALL_TORQUE_KGCM = ${STALL_TORQUE_KGCM}, SPEED_S_PER_60DEG = ${SPEED_S_PER_60DEG};

const clampPulse = ${src(clampPulse)};
const angleOf = ${src(angleOf)};
const servoState = ${src(servoState)};
const hornArmPath = ${src(hornArmPath)};
const hornHoles = ${src(hornHoles)};
const pwmPath = ${src(pwmPath)};
const knobPointerPath = ${src(knobPointerPath)};

const stage = document.querySelector('.iso-stage');
const svg = stage.querySelector('svg');
const horn = svg.querySelector('[data-part="horn"]');
const hornEdge = svg.querySelector('[data-part="horn-edge"]');
const holes = [0, 1].map(i => svg.querySelector('[data-part="horn-hole-' + i + '"]'));
const pwm = svg.querySelector('[data-part="pwm"]');
const pointer = svg.querySelector('[data-part="knob-pointer"]');
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const ctx = { onTop, proj: PROJECTION };

let pulse = ${parts.runtime.initialPulse};
let shown = pulse, frame = 0, last = 0, dragging = false, startY = 0, startPulse = pulse, idle = 0, touring = true, visible = false, clock = 0, knobT = 0;
const toUser = (e) => { const b = svg.getBoundingClientRect(); const s = b.width / ${WIDTH}; return [(e.clientX - b.left) / s, (e.clientY - b.top) / s]; };
const state = () => servoState(pulse, Math.abs(pulse - shown) > 0.01);

function draw() {
  const st = servoState(shown);
  const arm = hornArmPath(st.angle, GEO.shaft[0], GEO.shaft[1], GEO.hornLen, GEO.hornW, GEO.hornZ, ctx);
  if (horn) horn.setAttribute('d', arm);
  if (hornEdge) hornEdge.setAttribute('d', arm);
  const hs = hornHoles(st.angle, GEO.shaft[0], GEO.shaft[1], GEO.hornLen, GEO.holeR, GEO.hornZ, ctx);
  holes.forEach((el, i) => { if (el) el.setAttribute('d', hs[i]); });
  if (pwm) pwm.setAttribute('d', pwmPath(shown, GEO.screen, GEO.screenZ, ctx));
  const t = (pulse - (PULSE_KNOB_MIN_MS + PULSE_KNOB_MAX_MS) / 2) / ((PULSE_KNOB_MAX_MS - PULSE_KNOB_MIN_MS) / 2);
  knobT = t;
  if (pointer) pointer.setAttribute('d', knobPointerPath(t, GEO.knob[0], GEO.knob[1], GEO.knobR, GEO.knobZ, ctx));
  const text = '脉宽 ' + st.pulseMs.toFixed(2) + 'ms · 占空比 ' + st.duty.toFixed(1) + '% · ' + st.angle.toFixed(0) + '° · ' + (st.current * 1000).toFixed(0) + 'mA';
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute('aria-valuenow', st.pulseMs.toFixed(2));
  stage.setAttribute('aria-valuetext', text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    // 闲置巡演：在中位附近来回扫，并偶尔探到限位演示堵转
    const beat = Math.floor(clock / 2.6) % 5;
    pulse = [1.5, 0.5, 2.5, 1.0, 2.7][beat];
  }
  const target = pulse;
  shown = calm ? target : shown + (target - shown) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(target - shown) < 0.002) shown = target;
  draw();
  // 只有在"正在动"或"巡演"时才继续跑，避免空闲时白烧 CPU
  const settled = !touring && shown === pulse;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const stopTour = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run(); };

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) { if (still.matches) touring = false; run(); }
}, { rootMargin: '120px 0px' }).observe(stage);

stage.addEventListener('pointerdown', (e) => {
  stopTour();
  dragging = true; startY = e.clientY; startPulse = pulse;
  try { stage.setPointerCapture(e.pointerId); } catch {}
});
stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const step = Math.round((startY - e.clientY) / 6);
  pulse = clampPulse(startPulse + step * PULSE_STEP_MS);
  run();
});
const endDrag = () => { dragging = false; };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('keydown', (e) => {
  let used = true;
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') pulse = clampPulse(pulse + PULSE_STEP_MS);
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') pulse = clampPulse(pulse - PULSE_STEP_MS);
  else if (e.key === 'Home') pulse = PULSE_MIN_MS;
  else if (e.key === 'End') pulse = PULSE_MAX_MS;
  else if (e.key === ' ') pulse = 1.5;
  else used = false;
  if (!used) return;
  e.preventDefault();
  stopTour();
  run();
});

draw();

// 自动化测试钩子（离线预览专用）
window.__fig = {
  readout: () => readout.textContent,
  pulse: () => pulse,
  shown: () => shown,
  dragging: () => dragging,
  state: () => servoState(shown),
  knobScreen: () => KNOB_SCREEN,
  horn: () => (horn ? horn.getAttribute('d') : ''),
  svgBox: () => { const b = svg.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; },
  pointer: (type, x, y) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true })),
  key: (key) => stage.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })),
};
`;

const body = k.plateHtml({
  fig: 'Fig 2',
  title: 'SG90 舵机 · PWM 控制',
  hint: parts.hint,
  readout: '—',
  keys: parts.keys,
  caption: parts.caption,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="SG90 舵机：拖动或方向键调整脉宽，看手臂角度与 PWM 波形" aria-valuemin="${PULSE_KNOB_MIN_MS}" aria-valuemax="${PULSE_KNOB_MAX_MS}" aria-valuenow="1.5" style="touch-action:none">${svg}</div>`,
});

const html = k.pageHtml({ title: 'SG90 舵机 · PWM 控制', theme, body, script: kitScript() + live });
const file = join(OUT, theme === 'light' ? 'servo-sg90-light.html' : 'servo-sg90.html');
writeFileSync(file, html);
console.log('wrote', file);
