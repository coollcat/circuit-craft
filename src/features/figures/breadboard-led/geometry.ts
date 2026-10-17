// 面包板 LED 限流电路 —— 静态几何（离线预览与站点 React 组件共用同一份）
// 场景：实验垫上摆着 面包板 + 电阻箱 + 9V 电池 + 毫安表，串联成一个 LED 限流回路。
// 拨动电阻箱的四个拨盘改变 R，表针与 LED 亮度随之变化；R 太小则 LED 烧毁。
import * as k from '../kit/iso-kit';
import { DIAL_SET, digitOf, needleAt, pointerAt } from './parts';
import { DIGIT_WEIGHTS, resistanceOf, type Digits } from './model';
import {
  BASE, BASE_H, FOOT_H, BOARD, BOARD_H, BOX, BOX_H, DIAL_R, DIAL_H, DIAL_POS, DIAL_TOP, DIAL_Z,
  METER, METER_R, METER_H, METER_FACE, BATT, BATT_H, LED_POS, LED_Z, LED_SCREEN_Z, POSTS,
  COLS, COL0, COL_STEP, ROWS_TOP, ROWS_BOT, TRENCH_Y, RAIL_TOP_Y, RAIL_BOT_Y, P, at,
} from './scene';

export {
  BASE, BASE_H, FOOT_H, BOARD, BOARD_H, BOX, BOX_H, DIAL_R, DIAL_H, DIAL_Z, DIAL_TOP, DIAL_POS,
  METER, METER_R, METER_H, METER_Z, METER_FACE, NEEDLE_LEN, BATT, BATT_H, LED_POS, LED_Z, POSTS, P, WIDTH, HEIGHT,
} from './scene';

const S = (paths: k.SolidPaths, style?: k.SolidStyle) => k.solidSvg(paths, style);
const L = (d: string, style?: k.LineStyle) => k.lineSvg(d, style);
const byDepth = (points: k.Plane[]) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/** 表盘/拨盘上的圆弧（按扫描比例 0..1 给，与 radialTicks 同一角度口径） */
// kit 的 Tone 类型没列 'red'，但 ISO_CSS 里有 .iso-line[data-tone="red"]，故显式收窄再传。
const RED = 'red' as unknown as k.Tone;

function arcLine(cx: number, cy: number, r: number, from: number, to: number, z: number, tone: k.Tone): string {
  const steps = 26;
  const pts: k.Flat[] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = from + ((to - from) * i) / steps;
    const a = -Math.PI / 3 + (frac * Math.PI * 2) / 3;
    pts.push(at([cx + Math.sin(a) * r, cy - Math.cos(a) * r, z]));
  }
  return L(k.pathOf(pts), { tone });
}

/* ------------------------------------ 实验垫 ------------------------------------ */
function bench(): string {
  const out: string[] = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, P, 26), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 26), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P, 10), { tone: 'faint' }));
  const screws = k.corners(BASE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 14)).join(''), { tone: 'faint' }));
  out.push(k.dotsSvg(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5, tone: 'lo' }));

  // 边缘刻度尺：教学的「量感」，也是构图的下沿
  const strip = { x: BASE.x + 12, y: BASE.y + BASE.d - 16, w: BASE.w - 24, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'faint', crease: 'none' }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 5, strip.y + 1, 0.65, [2, 4], P);
  out.push(L(ticks.minor, { tone: 'faint' }), L(ticks.major, { tone: 'lo' }));
  out.push(k.dotsSvg([at([strip.x + 2, strip.y + 4, 0.6]), at([strip.x + strip.w - 2, strip.y + 4, 0.6])], { size: 0.4, tone: 'lo' }));

  // 铭牌：三行刻线，像真的仪器铭牌
  const plate = { x: BASE.x + 12, y: BASE.y + 12, w: 74, d: 26, r: 2 };
  out.push(S(k.slabOf(plate, 0, 1.2, P, 3, 0.4), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(plate, 2), 1.2, P, 3), { tone: 'faint' }));
  for (let i = 0; i < 3; i++) {
    const y = plate.y + 7 + i * 6;
    out.push(L(k.lineOnTop([plate.x + 6, y], [plate.x + plate.w - 6 - i * 14, y], 1.3, P), { tone: i === 0 ? 'lo' : 'faint' }));
  }
  return out.join('');
}

/* ------------------------------------ 面包板 ------------------------------------ */
function breadboard(): string {
  const out: string[] = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BOARD, 0, 0.2, P)}"/>`);
  out.push(S(k.slabOf(BOARD, 0, BOARD_H, P, 5, 1), { tone: 'hi' }));
  out.push(L(k.planOutline(k.insetPlan(BOARD, 4), BOARD_H, P, 5), { tone: 'faint' }));
  // 中央凹槽（DIP 芯片的隔离沟）
  out.push(L(k.lineOnTop([BOARD.x + 8, TRENCH_Y - 3], [BOARD.x + BOARD.w - 8, TRENCH_Y - 3], BOARD_H, P), { tone: 'lo' }));
  out.push(L(k.lineOnTop([BOARD.x + 8, TRENCH_Y + 3], [BOARD.x + BOARD.w - 8, TRENCH_Y + 3], BOARD_H, P), { tone: 'lo' }));
  // 电源轨（红线 / 蓝线）
  for (const [y, tone] of [[RAIL_TOP_Y, 'lo'], [RAIL_BOT_Y, 'lo']] as const) {
    out.push(L(k.lineOnTop([BOARD.x + 7, y], [BOARD.x + BOARD.w - 7, y], BOARD_H, P), { tone }));
  }
  // 孔阵：每组 5 孔
  const holes: k.Flat[] = [];
  for (let c = 0; c < COLS; c++) {
    const x = COL0 + c * COL_STEP;
    for (const y of ROWS_TOP) holes.push(at([x, y, BOARD_H]));
    for (const y of ROWS_BOT) holes.push(at([x, y, BOARD_H]));
  }
  for (let c = 0; c < COLS; c++) {
    const x = COL0 + c * COL_STEP;
    holes.push(at([x, RAIL_TOP_Y, BOARD_H]));
    holes.push(at([x, RAIL_BOT_Y, BOARD_H]));
  }
  out.push(k.dotsSvg(holes, { size: 0.6, tone: 'lo' }));
  // 两端安装耳
  for (const x of [BOARD.x - 5, BOARD.x + BOARD.w]) {
    out.push(S(k.slabOf({ x, y: BOARD.y + 30, w: 5, d: 40, r: 1.5 }, 0, BOARD_H - 3, P, 3, 0.4), { tone: 'mid' }));
  }
  const label = k.topMatrix([BOARD.x + 6, BOARD.y + BOARD.d + 9], 0.7, P);
  out.push(k.faceTextSvg(label, 'BREADBOARD 830', { size: 3.4, tone: 'lo' }));
  return out.join('');
}

/* ------------------------------------ 电阻箱 ------------------------------------ */
function decadeBox(digits: Digits): string {
  const out: string[] = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BOX, 0, 0.2, P)}"/>`);
  out.push(S(k.slabOf(BOX, 0, BOX_H, P, 7, 1.4), { tone: 'hi' }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 3.5), BOX_H, P, 7), { tone: 'faint' }));
  out.push(S(k.slabOf(k.insetPlan(BOX, 3.5), BOX_H, 1.2, P, 7), { tone: 'mid', crease: 'none' }));
  // 面板螺钉
  out.push(L(k.corners(k.insetPlan(BOX, 6), 0).map(([x, y]) => k.ring(x, y, 1.7, BOX_H + 1.2, P, 12)).join(''), { tone: 'faint' }));
  out.push(k.dotsSvg(k.corners(k.insetPlan(BOX, 6), 0).map(([x, y]) => at([x, y, BOX_H + 1.2])), { size: 0.38, tone: 'lo' }));

  DIAL_POS.forEach(([x, y], index) => {
    const weight = DIGIT_WEIGHTS[index];
    out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z + 1.2, DIAL_H, P, 40, 0.7), { tone: 'hi', crease: 'lo' }));
    out.push(L(k.knurl(x, y, DIAL_R, DIAL_Z + 2.2, DIAL_Z + DIAL_H - 0.6, 40, P, 0.35), { tone: 'faint' }));
    out.push(L(k.ring(x, y, DIAL_R - 1.6, DIAL_TOP, P, 40), { tone: 'lo' }));
    const ticks = k.radialTicks(x, y, DIAL_R - 2.4, 10, 1, DIAL_TOP, [1.2, 2.2], P, -Math.PI * (5 / 6), Math.PI * (5 / 3));
    out.push(L(ticks.minor, { tone: 'lo' }));
    out.push(k.faceTextSvg(k.topMatrix([x, y + 5.4], DIAL_TOP, P), `×${weight}`, { size: 3, tone: 'lo', anchor: 'middle' }));
    // 指针：由 data-part 供实时旋转
    out.push(
      k.groupSvg(L(pointerAt(x, y, digitOf(digits, index)), { tone: 'hi' }), {
        'data-part': `dial-${index}`,
        'data-lit': 'true',
      }),
    );
    out.push(k.dotsSvg([at([x, y, DIAL_TOP])], { size: 0.6, tone: 'hi' }));
  });

  // 铭牌 + 型号刻线
  const nameplate = { x: BOX.x + 8, y: BOX.y + BOX.d - 26, w: BOX.w - 16, d: 18, r: 1.5 };
  out.push(S(k.slabOf(nameplate, BOX_H + 1.2, 0.8, P, 3, 0.3), { tone: 'mid', crease: 'none' }));
  out.push(L(k.planOutline(nameplate, BOX_H + 2, P, 3), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([nameplate.x + 4, nameplate.y + 11], BOX_H + 2, P), 'DECADE R  0~9999Ω', { size: 3, tone: 'lo' }));

  // 两个接线柱（红 / 黑）
  POSTS.forEach(([x, y], index) => {
    out.push(S(k.cylinder(x, y, 4.6, BOX_H + 1.2, 3, P, 24), { tone: 'mid' }));
    out.push(S(k.cylinder(x, y, 3.2, BOX_H + 4.2, 7, P, 20, 0.6), { tone: index === 0 ? 'hi' : 'lo' }));
    out.push(L(k.knurl(x, y, 3.2, BOX_H + 4.6, BOX_H + 10.6, 22, P, 0.3), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 4.2, BOX_H + 11.2, 2, P, 20), { tone: index === 0 ? 'hi' : 'lo' }));
    out.push(k.dotsSvg([at([x, y, BOX_H + 13.2])], { size: 0.5, tone: 'hi' }));
  });
  return out.join('');
}

/* ------------------------------------ 9V 电池 ----------------------------------- */
function battery(): string {
  const out: string[] = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BATT, 0, 0.2, P)}"/>`);
  out.push(S(k.slabOf(BATT, 0, BATT_H, P, 4, 1), { tone: 'hi' }));
  out.push(L(k.planOutline(k.insetPlan(BATT, 2), BATT_H, P, 4), { tone: 'faint' }));
  out.push(S(k.slabOf(k.insetPlan(BATT, 1), BATT_H, 1.2, P, 4), { tone: 'mid', crease: 'none' }));
  // 两个接线帽（9V 电池的按扣）
  const [bx, by] = [BATT.x + BATT.w / 2, BATT.y + BATT.d / 2];
  out.push(S(k.cylinder(bx - 8, by, 5.4, BATT_H + 1.2, 3.4, P, 24), { tone: 'lo' }));
  out.push(L(k.ring(bx - 8, by, 3.4, BATT_H + 4.6, P, 20), { tone: 'faint' }));
  out.push(S(k.cylinder(bx + 8, by, 5.4, BATT_H + 1.2, 2.6, P, 24), { tone: 'lo' }));
  out.push(L(k.ring(bx + 8, by, 3.6, BATT_H + 3.8, P, 20), { tone: 'faint' }));
  // 扣在上面的电池扣 + 引出线
  out.push(S(k.slabOf({ x: bx - 16, y: by - 12, w: 32, d: 24, r: 3 }, BATT_H + 4.6, 4, P, 4, 0.5), { tone: 'mid' }));
  out.push(k.dotsSvg([at([bx - 8, by, BATT_H + 8.6]), at([bx + 8, by, BATT_H + 8.6])], { size: 0.45, tone: 'lo' }));
  const label = k.topMatrix([BATT.x + 4, BATT.y + 9], BATT_H + 1.3, P);
  out.push(k.faceTextSvg(label, '9V', { size: 4, tone: 'lo' }));
  const label2 = k.topMatrix([BATT.x + 4, BATT.y + 17], BATT_H + 1.3, P);
  out.push(k.faceTextSvg(label2, 'ALKALINE', { size: 2.4, tone: 'faint' }));
  return out.join('');
}

/* ------------------------------------ 毫安表 ------------------------------------ */
function meter(): string {
  const [mx, my] = METER;
  const out: string[] = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: mx - METER_R, y: my - METER_R, w: METER_R * 2, d: METER_R * 2, r: METER_R }, 0, 0.2, P)}"/>`);
  out.push(S(k.cylinder(mx, my, METER_R, 0, METER_H, P, 48, 1), { tone: 'mid' }));
  out.push(S(k.cylinder(mx, my, METER_R - 3, METER_H, 1.4, P, 48), { tone: 'hi', crease: 'lo' }));
  out.push(L(k.ring(mx, my, METER_R - 3, METER_H + 1.4, P, 48), { tone: 'lo' }));
  // 刻度弧：0~100mA
  const ticks = k.radialTicks(mx, my, METER_R - 7, 20, 5, METER_FACE + 0.1, [1.6, 3.2], P, -Math.PI * (1 / 3), Math.PI * (2 / 3));
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'hi' }));
  // 红色过载带：20mA（LED 额定）以上——表盘上直接标出「灯开始受罪」的位置
  out.push(arcLine(mx, my, METER_R - 9, 0.2, 1, METER_FACE + 0.1, RED));
  for (const [label, frac] of [['0', 0], ['50', 0.5], ['100', 1]] as const) {
    const angle = -Math.PI / 3 + frac * (Math.PI * 2) / 3;
    const lx = mx + Math.sin(angle) * (METER_R - 12);
    const ly = my - Math.cos(angle) * (METER_R - 12);
    out.push(k.faceTextSvg(k.topMatrix([lx, ly], METER_FACE + 0.1, P), label, { size: 3, tone: 'lo', anchor: 'middle' }));
  }
  out.push(k.faceTextSvg(k.topMatrix([mx, my + 16], METER_FACE + 0.1, P), 'mA DC', { size: 3.2, tone: 'lo', anchor: 'middle' }));
  // 调零螺钉
  out.push(S(k.cylinder(mx - 14, my + 22, 3, METER_H + 1.4, 1.6, P, 16), { tone: 'mid' }));
  out.push(L(k.knurl(mx - 14, my + 22, 3, METER_H + 1.6, METER_H + 3, 14, P, 0.3), { tone: 'faint' }));
  // 指针（实时）
  out.push(k.groupSvg(L(needleAt(0), { tone: 'hi' }), { 'data-part': 'needle', 'data-free': 'start' }));
  out.push(S(k.cylinder(mx, my, 2.4, METER_H + 1.4, 2, P, 16), { tone: 'mid' }));
  // 两个接线柱（表笔）
  for (const [x, tone] of [[mx - 20, 'hi'], [mx + 20, 'lo']] as const) {
    out.push(S(k.cylinder(x, my - METER_R + 4, 3.4, METER_H + 1.4, 5, P, 18, 0.5), { tone }));
    out.push(L(k.knurl(x, my - METER_R + 4, 3.4, METER_H + 2, METER_H + 6, 18, P, 0.3), { tone: 'lo' }));
    out.push(k.dotsSvg([at([x, my - METER_R + 4, METER_H + 6.4])], { size: 0.45, tone: 'hi' }));
  }
  return out.join('');
}

/* ------------------------------------- LED ------------------------------------- */
function led(): string {
  const [lx, ly] = LED_POS;
  const out: string[] = [];
  // 落在面包板上的光斑（亮度实时）
  out.push(
    `<path data-part="led-glow" d="${k.onTop(k.circleRing(lx, ly, 21, 40), LED_Z + 0.3, P, true)}" fill="rgb(255,96,72)" opacity="0" style="filter:blur(7px)"/>`,
  );
  // 烧毁后的熏黑痕迹
  out.push(
    `<path data-part="led-soot" d="${k.onTop(k.circleRing(lx, ly, 7, 24), LED_Z + 0.4, P, true)}" fill="rgb(20,16,14)" opacity="0"/>`,
  );
  // 两根引脚
  for (const [dx, len] of [[-2.6, 0], [2.6, 1]] as const) {
    out.push(S(k.cylinder(lx + dx, ly, 0.7, LED_Z - 2, 3.4 + len, P, 10), { tone: 'lo' }));
    out.push(k.dotsSvg([at([lx + dx, ly, LED_Z])], { size: 0.55, tone: 'lo' }));
  }
  // 管座法兰 + 管身 + 顶帽
  out.push(S(k.cylinder(lx, ly, 5.6, LED_Z + 1.4, 1.6, P, 28), { tone: 'mid' }));
  out.push(
    k.groupSvg(S(k.cylinder(lx, ly, 5.2, LED_Z + 3, 11.4, P, 30, 0.7), { tone: 'hi', lit: true }), {
      'data-part': 'led-dome',
    }),
  );
  out.push(S(k.cylinder(lx, ly, 4, LED_Z + 14.4, 2.6, P, 26, 0.6), { tone: 'hi', lit: true }));
  out.push(L(k.ring(lx, ly, 5.2, LED_Z + 3, P, 30), { tone: 'lo' }));
  // 阴极侧的削平标记
  out.push(L(k.lineOnTop([lx - 5.2, ly - 1.8], [lx - 5.2, ly + 1.8], LED_Z + 3.6, P), { tone: 'lo' }));
  return out.join('');
}

/* ---------------------------------- 跳线（导线） ---------------------------------- */
// 硬芯跳线是「先弯 90° 再抬起来」的平滑弧线：用二次贝塞尔采样成折线，
// 避免只在两端点之间插 1~2 个拐点造成的尖角（尖角会被读成"折断了"）。
type P3 = [number, number, number];

function endDot([x, y]: k.Flat, size: number): string {
  return `<circle class="iso-wire-end" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}"/>`;
}

function arcWire(a: P3, c: P3, b: P3, tone: k.Tone, size = 1.4): string {
  const steps = 18;
  const pts: k.Flat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push(
      at([
        u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
        u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
        u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
      ]),
    );
  }
  return `<g class="iso-wire" data-tone="${tone}">${L(k.pathOf(pts), { tone })}${endDot(pts[0], size)}${endDot(pts[pts.length - 1], size)}</g>`;
}

interface Jumper {
  from: P3;
  control: P3;
  to: P3;
  tone: k.Tone;
}

const BATT_POS: P3 = [BATT.x + BATT.w / 2 - 8, BATT.y + BATT.d / 2, BATT_H + 8.6];
const BATT_NEG: P3 = [BATT.x + BATT.w / 2 + 8, BATT.y + BATT.d / 2, BATT_H + 8.6];
const RAIL_L: P3 = [BOARD.x + 12, RAIL_TOP_Y, BOARD_H];
const RAIL_R: P3 = [BOARD.x + BOARD.w - 14, RAIL_TOP_Y, BOARD_H];
const POST_A: P3 = [POSTS[0][0], POSTS[0][1], BOX_H + 13.2];
const POST_B: P3 = [POSTS[1][0], POSTS[1][1], BOX_H + 13.2];
const LED_A: P3 = [LED_POS[0] + 2.6, LED_POS[1], LED_Z + 1.4];
const LED_K: P3 = [LED_POS[0] - 2.6, LED_POS[1], LED_Z + 1.4];
const MTR_P: P3 = [METER[0] - 20, METER[1] - METER_R + 4, METER_H + 6];
const MTR_N: P3 = [METER[0] + 20, METER[1] - METER_R + 4, METER_H + 6];

const JUMPERS: Jumper[] = [
  // 电池 + → 面包板电源轨（从台面左侧绕过去）
  { from: BATT_POS, control: [-152, 22, 48], to: RAIL_L, tone: 'hi' },
  // 电源轨 → 电阻箱 A 柱
  { from: RAIL_R, control: [34, -62, 36], to: POST_A, tone: 'hi' },
  // 电阻箱 B 柱 → LED 阳极（跨过整块面包板的一个大弧）
  { from: POST_B, control: [40, -78, 56], to: LED_A, tone: 'lo' },
  // LED 阴极 → 毫安表 +（从表头上方跨过去）
  { from: LED_K, control: [6, 14, 40], to: MTR_P, tone: 'lo' },
  // 毫安表 − → 电池 −（沿台面前沿绕回来，不压表盘）
  { from: MTR_N, control: [10, 116, 40], to: BATT_NEG, tone: 'faint' },
];

function wires(): string {
  return JUMPERS.map(w => arcWire(w.from, w.control, w.to, w.tone)).join('');
}

/* --------------------------- 台面上的散件（备用跳线 / 电阻） --------------------------- */
function spares(): string {
  const out: string[] = [];
  // 一卷备用跳线：两条搭在台面上的短线
  out.push(k.wireSvg(at([-92, 80, 1]), at([-52, 94, 1]), { via: [at([-74, 100, 8])], tone: 'faint', size: 1.1 }));
  out.push(k.wireSvg(at([-88, 92, 1]), at([-58, 84, 1]), { via: [at([-72, 76, 7])], tone: 'faint', size: 1.1 }));
  // 一颗躺在台面上的电阻：本体 + 四道色环 + 两根引脚
  const body = { x: -34, y: 84, w: 17, d: 6, r: 2.4 };
  out.push(S(k.slabOf(body, 1, 4.2, P, 4, 0.8), { tone: 'mid' }));
  out.push(L(k.planOutline(body, 5.2, P, 4), { tone: 'lo' }));
  for (const [offset, tone] of [[3.2, 'lo'], [6.4, 'red'], [9.6, 'lo'], [12.8, 'mid']] as const) {
    out.push(L(k.lineOnTop([body.x + offset, body.y], [body.x + offset, body.y + body.d], 5.24, P), { tone }));
  }
  out.push(L(k.lineOnTop([body.x + body.w, body.y + body.d / 2], [body.x + body.w + 6, body.y + body.d / 2 + 4], 4, P), { tone: 'lo' }));
  out.push(L(k.lineOnTop([body.x, body.y + body.d / 2], [body.x - 6, body.y + body.d / 2 - 4], 4, P), { tone: 'lo' }));
  out.push(k.dotsSvg([at([body.x + body.w + 6, body.y + body.d / 2 + 4, 4]), at([body.x - 6, body.y + body.d / 2 - 4, 4])], { size: 0.45, tone: 'lo' }));
  return out.join('');
}

/* ------------------------------------ 组装 ------------------------------------ */
export interface FigureParts {
  body: string;
  label: string;
  caption: string;
  hint: string;
  keys: { mark: 'lit' | 'raised' | 'flat'; label: string }[];
  /** 供实时脚本使用的常量（拨盘屏幕坐标、表头中心等） */
  runtime: {
    dials: { x: number; y: number; screen: k.Flat }[];
    meterScreen: k.Flat;
    meterZ: number;
    ledScreen: k.Flat;
    initial: Digits;
    initialR: number;
  };
}

export function buildParts(digits: Digits = DIAL_SET): FigureParts {
  const body = [
    bench(),
    breadboard(),
    spares(),
    decadeBox(digits),
    battery(),
    meter(),
    led(),
    wires(),
  ].join('');

  return {
    body,
    label:
      'A breadboard LED current-limiting bench: a 9 V battery, a decade resistance box and a milliammeter in series with a red LED. Turning the four dials changes the series resistance; the ammeter needle and the LED brightness follow I = (9 V − 2 V) / (R + 5 Ω).',
    hint: '拖动 / 方向键拨动电阻箱的四个拨盘',
    caption:
      '把电阻箱拨到 470 Ω：I = (9 − 2) / (470 + 5) = 14.7 mA，灯正常亮。拨到 100 Ω：I = 66.7 mA，超过额定三倍，0.1 秒后 LED 烧毁。这就是 LED 必须串限流电阻的原因。',
    keys: [
      { mark: 'lit', label: 'LED 与表针：电流走到哪，它们就动到哪' },
      { mark: 'raised', label: '电阻箱四拨盘 ×1000 / ×100 / ×10 / ×1' },
      { mark: 'flat', label: '面包板 830 孔、电源轨与中央凹槽' },
    ],
    runtime: {
      dials: DIAL_POS.map(([x, y]) => ({ x, y, screen: at([x, y, DIAL_TOP]) })),
      meterScreen: at([METER[0], METER[1], METER_FACE]),
      meterZ: METER_FACE,
      ledScreen: at([LED_POS[0], LED_POS[1], LED_SCREEN_Z]),
      initial: digits,
      initialR: resistanceOf(digits),
    },
  };
}
