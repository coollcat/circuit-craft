// 回路工坊 — 开发联调用示例关卡（fixtures）
// 内容组正式关卡装载前，LevelPlay 用这些兜底并显示「内容装载中」占位。
//
// 教学近似假设汇总（与 solver.ts COMP_META 一致）：
// · LED：分段线性 Vf=2V + rOn=5Ω，I>3×imax 持续 0.1s 烧毁
// · 电容：DC 开路，时域梯形法伴随模型
// · NPN：简化开关模型（Vbe>0.7 → C-E 饱和，Vce(sat)≈0.2V）
// · LDO(ic)/mcu/module/antenna/crystal/sensor：见 COMP_META.note
// · branch-current 目标单位：mA（内容组契约）
import type { LevelDef } from './types';

export const FIXTURE_LEVELS: LevelDef[] = [
  {
    id: 'fixture-led',
    track: 'main',
    chapter: 1,
    index: 4,
    title: '点亮一颗 LED（示例）',
    subtitle: '限流电阻计算',
    briefing: '目标：用限流电阻点亮 LED，电流 5~20mA。直接连电源会烧掉它！',
    intro: [
      { speaker: 'laozhou', text: '先想想电流从哪儿来，到哪儿去。LED 是个娇气元件——2V 压降，20mA 就到头了。' },
      { speaker: 'xiaohan', text: '把电阻拖到画布上，然后按住端口的小圆点拖出导线连起来！R = (Vcc − Vf) / If 试试 220Ω。' },
    ],
    outro: [
      { speaker: 'laozhou', text: '漂亮！没有限流电阻，LED 就是一根保险丝。这就是你打板生涯的第一课。' },
    ],
    palette: [
      { id: 'R1', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
      { id: 'R2', type: 'resistor', x: 0, y: 0, params: { resistance: 10 } },
      { id: 'SW1', type: 'switch', x: 0, y: 0, params: { closed: true } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 160, params: { voltage: 5 }, locked: true },
        { id: 'LED1', type: 'led', x: 480, y: 160, params: { vf: 2, rOn: 5, imax: 0.02 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 352, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 5, max: 20 },
    ],
    stars: [
      { id: 'pass', label: '完成关卡', check: 'custom' },
      { id: 'lean', label: '元件数 ≤ 3', check: 'custom', value: 3 },
      { id: 'no-hint', label: '不使用提示', check: 'no-hint' },
    ],
    hints: [
      '想想：LED 能承受多大电流？电源 5V 直接怼上去会发生什么？',
      '需要串联一个电阻吃掉多余的电压：R = (5 − 2) / 0.015 ≈ 200Ω，用 220Ω 正好。',
      '把 R1(220Ω) 放在 BT1 与 LED1 之间：BT1.pos → R1 → LED1.a，LED1.k → GND1，BT1.neg → GND1。',
    ],
    knowledge: { title: '限流电阻', body: 'R = (Vcc − Vf) / If。LED 是非线性元件，没有限流电阻时电流会爆炸式增长。' },
    sim: { probes: [{ comp: 'LED1', port: 'a' }] },
  },
  {
    id: 'fixture-rc',
    track: 'main',
    chapter: 3,
    index: 3,
    title: 'RC 充放电（示例）',
    subtitle: '时间常数 τ = R × C',
    briefing: '目标：用函数发生器 + RC 电路，在示波器上观察电容的充放电曲线。',
    intro: [
      { speaker: 'laozhou', text: '电容像个小水桶——充电放水都要时间。τ = R×C 就是它的「性格」。' },
      { speaker: 'xiaohan', text: '方波进来，三角状的充放电曲线出去！把示波器探头接到电容上看看。' },
    ],
    outro: [{ speaker: 'laozhou', text: '看到那条圆滑的曲线了吗？以后你滤的每一个波、消的每一次抖，都有它的影子。' }],
    palette: [
      { id: 'R1', type: 'resistor', x: 0, y: 0, params: { resistance: 1000 } },
      { id: 'C1', type: 'capacitor', x: 0, y: 0, params: { capacitance: 1e-6 } },
    ],
    preset: {
      components: [
        { id: 'FG1', type: 'funcgen', x: 96, y: 192, params: { waveform: 'square', freq: 100, vmin: 0, vmax: 5 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 384, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'capacitor', count: 1 },
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'C1', port: 'a' } },
      { kind: 'connected', a: { comp: 'C1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
    ],
    stars: [
      { id: 'pass', label: '完成关卡', check: 'custom' },
      { id: 'first', label: '一次通过', check: 'first-try' },
      { id: 'no-hint', label: '不使用提示', check: 'no-hint' },
    ],
    hints: [
      '想想：什么东西能「存电」再慢慢放掉？',
      '电阻限制充放电电流，电容存电。τ = R×C，1kΩ × 1µF = 1ms，正好配合 100Hz 方波。',
      'FG1.out → R1 → C1.a，C1.b → GND1，FG1.gnd → GND1。示波器 CH1 接 C1.a 看充放电曲线。',
    ],
    knowledge: { title: 'RC 时间常数', body: 'τ = R × C。充电 1τ 到 63%，5τ 基本充满。示波器上量一量！' },
    sim: { probes: [{ comp: 'C1', port: 'a' }] },
  },
  {
    id: 'fixture-divider',
    track: 'main',
    chapter: 3,
    index: 1,
    title: '分压电路（示例）',
    subtitle: 'Vout = Vin × R2 / (R1 + R2)',
    briefing: '目标：用两个电阻把 9V 分成 4~5V，给「传感器」一个合适的参考电压。',
    intro: [
      { speaker: 'laozhou', text: '两个电阻手拉手，电压按阻值比例分。这是全模拟电路里出现次数最多的结构。' },
    ],
    outro: [{ speaker: 'xiaohan', text: '分压点电压完美！以后偏置三极管、给 ADC 参考，都是这一招。' }],
    palette: [
      { id: 'R1', type: 'resistor', x: 0, y: 0, params: { resistance: 10000 } },
      { id: 'R2', type: 'resistor', x: 0, y: 0, params: { resistance: 10000 } },
      { id: 'RP1', type: 'pot', x: 0, y: 0, params: { resistance: 10000, wiper: 0.5 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 160, params: { voltage: 9 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 352, locked: true },
        { id: 'VM1', type: 'voltmeter', x: 512, y: 256, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'VM1', port: 'pos' } },
      { kind: 'node-voltage', node: { comp: 'VM1', port: 'pos' }, min: 4, max: 5 },
    ],
    stars: [
      { id: 'pass', label: '完成关卡', check: 'custom' },
      { id: 'lean', label: '元件数 ≤ 4', check: 'custom', value: 4 },
      { id: 'no-hint', label: '不使用提示', check: 'no-hint' },
    ],
    hints: [
      '9V 变成一半？两个一样大的电阻可以做到。',
      'R1 从电源正到分压点，R2 从分压点到地。Vout = 9 × R2/(R1+R2)。R1=R2=10kΩ 时 Vout=4.5V。',
      'BT1.pos → R1 → VM1.pos（分压点），VM1.pos → R2 → GND1，BT1.neg → GND1。或用电位器 RP1：a 接正，b 接地，w 出分压。',
    ],
    knowledge: { title: '分压公式', body: 'Vout = Vin × R2 / (R1 + R2)。电位器就是可调的分压器。' },
    sim: { probes: [{ comp: 'VM1', port: 'pos' }] },
  },
];

export function getFixtureLevel(id: string): LevelDef | undefined {
  return FIXTURE_LEVELS.find(l => l.id === id);
}
