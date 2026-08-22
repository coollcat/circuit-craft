// 第 3 章 · 原理图设计（5 关）—— 分压、串并联、RC 波形、滤波、三极管开关
// 单位约定：电压 V，电流 mA。LED Vf=2V，NPN Vbe=0.7V、β=100。
import type { LevelDef } from '@/engine/types';

export const C3_LEVELS: LevelDef[] = [
  {
    id: 'c3-1',
    track: 'main',
    chapter: 3,
    index: 1,
    title: '分压器：把电压切开用',
    subtitle: '两个电阻的魔法比例',
    briefing:
      '老周要一个 6V 的参考点，但台上只有 9V 电池。用两颗电阻搭一个分压器：上方已固定 1kΩ，你来选下方的电阻，让中点电压落在 5.7~6.3V。',
    intro: [
      { speaker: 'laozhou', text: '原理图设计第一课：分压器。两个电阻一串，中点电压 = 电源 × 下电阻 ÷（上电阻＋下电阻）。这个式子比欧姆定律还常用。' },
      { speaker: 'xiaohan', text: '9V 要变 6V？6 = 9 × R下 ÷ (1k + R下)，算算算……R下 = 2k！' },
      { speaker: 'laozhou', text: '别光顾着算。想想：分压器能不能当电源用？接个负载会怎样？先记住结论——会塌。为什么，知识卡里讲。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '中点稳稳的 6V！比例就是力量！' },
      { speaker: 'laozhou', text: '冷知识：示波器探头里的 10× 衰减，本质就是一颗 9MΩ 配 1MΩ 的分压器。你手里每支探头都藏着今天这个电路。' },
    ],
    palette: [
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 2000 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 9 }, locked: true },
        { id: 'R1', type: 'resistor', x: 288, y: 96, params: { resistance: 1000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 288, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'RP2', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 1800, max: 2200 },
      { kind: 'node-voltage', node: { comp: 'RP2', port: 'a' }, min: 5.7, max: 6.3 },
    ],
    stars: [
      { id: 'first-try', label: '一次算对比例', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '分压公式：V中点 = 9V × R下 ÷ (1k + R下)。目标是 6V。',
      '6 ÷ 9 = 2/3，也就是 R下 占总阻值的 2/3。R下 = 2kΩ 时比例正好。',
      'RP2 设为 2000Ω，串联在 R1 与地之间。中点 V = 9×2000/3000 = 6V。',
    ],
    knowledge: {
      title: '分压器的能与不能',
      body: '电阻分压器输出 Vout = Vin × R下 ÷ (R上 + R下)，是提供参考电压、电平缩放、传感器读取的第一选择。但它有个致命软肋：不能带负载。一旦中点接出电流，下电阻等效阻值变小，电压立刻塌陷——比如本关的 6V 中点接上 1kΩ 负载，等效下阻变成 667Ω，输出跌到 5.1V。所以分压器只做「给人看的电压」（给运放、ADC 这些高阻输入），不做「给人用的电源」。经验法则：分压器自身电流至少要是负载电流的 10 倍，电压才算稳。真要降压供电，请用 LDO 或 DC-DC——第 7 章见分晓。',
    },
    // 验算: V中点=9×R2/(1k+R2)；R2=2k → 6.0V ∈ [5.7,6.3] ✓；R2∈[1800,2200] → V∈[5.79,6.19] ⊂ [5.7,6.3] ✓
  },
  {
    id: 'c3-2',
    track: 'main',
    chapter: 3,
    index: 2,
    title: '串联与并联：电流的分叉口',
    subtitle: '两条支路，各自安好',
    briefing:
      '客户想用一个 5V 电源点亮两颗 LED，亮度还要一致。把两颗 LED 并联——注意：每颗 LED 必须配自己的限流电阻，各支路电流都要落在 10~18mA。',
    intro: [
      { speaker: 'laozhou', text: '串联分压，并联分流。并联的每条支路吃的是同一个电压，各走各的电流，互不干扰——家里的插座全是并联的。' },
      { speaker: 'xiaohan', text: '千万！千万！别图省事让两颗 LED 共用一颗电阻！会亮度不均还会抢电流！' },
      { speaker: 'laozhou', text: '为什么？LED 的 Vf 有离散性，2.0V 和 2.2V 的两颗并在一起，2.0V 那颗会把电流全抢走，先亮先烧。各配各的电阻，才叫工程。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '两颗灯一样亮！这就是对称的美感！' },
      { speaker: 'laozhou', text: '冷知识：圣诞灯串是串联的，一颗烧了整串灭——所以现在的灯串里每颗都藏了个并联的小分流器。工程里的每个「奇怪设计」，背后都是一次烧出来的教训。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 192, params: { voltage: 5 }, locked: true },
        { id: 'LED1', type: 'led', x: 352, y: 96, params: { vf: 2 }, locked: true },
        { id: 'LED2', type: 'led', x: 352, y: 288, params: { vf: 2 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'LED2', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'connected', a: { comp: 'LED2', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'led-lit', comp: 'LED2' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
      { kind: 'branch-current', comp: 'LED2', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '一次点亮双灯', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '并联 = 两条独立支路接在同一对电源节点之间。每条支路 = 一颗电阻 + 一颗 LED。',
      '每条支路的算法和上一章一样：(5−2)÷220 ≈ 13.6mA。两颗电阻都用 220Ω。',
      'RP1 串 LED1、RP2 串 LED2，两条支路的进端都接 BT1 正极，出端都接 BT1 负极。',
    ],
    knowledge: {
      title: '串并联的心法',
      body: '串联：电流只有一条路，处处相等，电压按阻值比例分配。并联：电压共用一个，各支路电流独立，总电流等于各支路之和。两个实用推论：并联后等效电阻一定小于最小的那个（1/Req = 1/R1 + 1/R2），两颗相同电阻并联直接减半；LED 这类 Vf 有离散的元件严禁共用限流电阻并联——Vf 低的会抢走大部分电流，形成「越热越抢、越抢越热」的恶性循环。工程习惯：多路 LED 指示灯，每路独立电阻；多芯片供电入口并联，每路独立去耦电容。「共电压、分电流、各配保险」，是并联设计的十字诀。',
    },
    // 验算: 每条支路 I=(5−2)/220=13.6mA ∈ [10,18]mA ✓；两支路互不影响（并联等压）✓
  },
  {
    id: 'c3-3',
    track: 'main',
    chapter: 3,
    index: 3,
    title: '会呼吸的波形：RC 充放电',
    subtitle: '第一次在示波器上看 τ',
    briefing:
      '接上信号发生器（100Hz 方波，0~5V），让它通过 1kΩ 电阻给 1µF 电容充放电。把示波器探头搭在电容上，你会看到方波被「磨」成了锯齿状的呼吸曲线。接通整条链路即过关。',
    intro: [
      { speaker: 'laozhou', text: '从这关开始，示波器是你的第二双眼睛。方波跳变是「瞬间」，电容充放电是「过程」——RC 电路把瞬间拉成了过程。' },
      { speaker: 'xiaohan', text: 'τ = 1k × 1µ = 1ms，方波半周期 5ms = 5τ，刚好能充满又放完！波形会是一个个圆角小山包！' },
      { speaker: 'laozhou', text: '看波形先看三件事：幅度对不对、形状对不对、时间对不对。养成这个习惯，调板子时能省一半时间。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '方波进去，山包出来！这曲线我能看一整天！' },
      { speaker: 'laozhou', text: '冷知识：MCU 的上电复位电路就是一颗 RC——靠电容慢慢充电，让复位脚晚几十毫秒放开，等电源稳了芯片再开工。你电脑每次开机都有它。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'FG1', type: 'funcgen', x: 96, y: 176, params: { waveform: 'square', freq: 100, vmin: 0, vmax: 5, duty: 0.5 }, locked: true },
        { id: 'R1', type: 'resistor', x: 288, y: 96, params: { resistance: 1000 }, locked: true },
        { id: 'C1', type: 'capacitor', x: 288, y: 256, params: { capacitance: 1e-6 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'C1', port: 'a' } },
      { kind: 'connected', a: { comp: 'C1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次完成', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      'RC 低通结构：信号从电阻进，电容上取出。和 c2-1 的充电回路拓扑一样，只是电源换成了信号发生器。',
      'FG1.out → R1 → C1 → 地；信号发生器的地也要接到公共地。',
      '连线四条：FG1.out→R1.a，R1.b→C1.a，C1.b→GND1，FG1.gnd→GND1。运行后看 C1 节点的波形。',
    ],
    knowledge: {
      title: '看懂 RC 波形的三个刻度',
      body: '方波驱动 RC 电路，电容电压呈现「指数爬坡 + 指数下坡」的锯齿。读这种波形记住三个刻度：τ = RC 决定爬升快慢（本关 1ms）；方波半周期决定能爬多高（本关 5ms = 5τ，恰好基本充满 5V、放完回 0V）；当半周期远小于 τ 时，电容来不及充放，输出就缩成一条微微起伏的直流——这正是下一关「滤波」的原理。同一个 RC，输入快它就平滑，输入慢它就跟随。频率与时间常数的相对关系，决定了电路呈现出哪种性格。这也是「时域」和「频域」这对孪生视角的第一次照面。',
    },
    sim: { duration: 30, probes: [{ comp: 'C1', port: 'a' }, { comp: 'FG1', port: 'out' }] },
    // 验算: τ=RC=1k×1µ=1ms；方波 T=10ms，半周期 5ms=5τ → 每半周期充/放达 99%+，波形幅度 0~5V 完整可见 ✓
  },
  {
    id: 'c3-4',
    track: 'main',
    chapter: 3,
    index: 4,
    title: 'RC 滤波：给信号顺顺毛',
    subtitle: '截止频率 fc = 1/(2πRC)',
    briefing:
      '信号发生器输出 1kHz 方波（0~5V），方波里全是你不想要的高频毛刺。设计一个 RC 低通滤波器：R 用 10kΩ，C 用 1µF，把输出变成一条平稳的直流（目标均值 2.3~2.7V）。',
    intro: [
      { speaker: 'laozhou', text: '低通滤波器，让低频过、把高频拦下。分界线叫截止频率 fc = 1/(2πRC)。1kHz 的方波撞上一堵 16Hz 的墙，会剩下什么？' },
      { speaker: 'xiaohan', text: '剩下……它的平均值！2.5V！毛刺全被电容吃掉了！' },
      { speaker: 'laozhou', text: '对。fc 之外，信号每翻 10 倍频率就被压到 1/10。这就是「一阶滚降 −20dB/十倍频」，先记住这个手感。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '毛刺消失了！输出稳得像一潭湖水！' },
      { speaker: 'laozhou', text: '冷知识：PWM 调光、DAC 偷懒输出模拟量，用的都是这招——高速方波 + 低通滤波 = 任意直流电压。你音箱里的 D 类功放也是这个思路。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'FG1', type: 'funcgen', x: 96, y: 176, params: { waveform: 'square', freq: 1000, vmin: 0, vmax: 5, duty: 0.5 }, locked: true },
        { id: 'R1', type: 'resistor', x: 288, y: 96, params: { resistance: 10000 }, locked: true },
        { id: 'C1', type: 'capacitor', x: 288, y: 256, params: { capacitance: 1e-6 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'C1', port: 'a' } },
      { kind: 'connected', a: { comp: 'C1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'node-voltage', node: { comp: 'C1', port: 'a' }, min: 2.3, max: 2.7 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次完成', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '拓扑和上一关完全一样（RC 低通），不同的是参数：τ 要远大于信号周期，输出才平。',
      'τ = 10k × 1µ = 10ms，而 1kHz 方波半周期只有 0.5ms —— 电容来不及跟随，只能停在平均值。',
      '连线四条同 c3-3。输出均值 = 5V × 50% 占空比 = 2.5V，纹波约 ±60mV，稳落在目标区间。',
    ],
    knowledge: {
      title: '截止频率：滤波器的世界观',
      body: 'RC 低通的截止频率 fc = 1/(2πRC)，本关 fc = 1/(2π×10k×1µ) ≈ 15.9Hz。fc 不是一刀切的墙，而是「−3dB 点」：此频率处输出幅度降到 70.7%；低于 fc 基本放行，高于 fc 每十倍频率再压 20dB（一阶滚降）。1kHz 信号比 fc 高近两个数量级，被衰减约 40 倍，于是方波的跳变沿被彻底磨平，只剩 2.5V 平均值。设计口诀：想滤掉的噪声频率要比 fc 高 10 倍以上，想保留的信号要比 fc 低 10 倍以下，中间区域是「既滤不干净又保不完整」的灰色地带。电源去耦、音频分频、抗混叠，全是这条公式的变装演出。',
    },
    sim: { duration: 50, probes: [{ comp: 'C1', port: 'a' }, { comp: 'FG1', port: 'out' }] },
    // 验算: τ=10k×1µ=10ms，半周期 0.5ms=0.05τ；稳态均值=5×0.5=2.5V，
    // 纹波峰峰值≈(2.5V)×(0.5ms/10ms)/2≈±63mV → 输出∈[2.44,2.56]V ⊂ [2.3,2.7]V ✓
  },
  {
    id: 'c3-5',
    track: 'main',
    chapter: 3,
    index: 5,
    title: '三极管开关：自动夜灯雏形',
    subtitle: '按键一按，灯就亮了',
    briefing:
      '章底综合：用按键控制三极管，再由三极管点亮 LED——小电流控制大电流的完整信号链。按下按键，基极经 10kΩ 得电，集电极的 LED 支路（220Ω）导通。目标：LED 亮，电流 10~18mA。',
    intro: [
      { speaker: 'laozhou', text: '按键电流只有零点几毫安，直接驱动 LED 太勉强。让三极管来：按键管「发令」，电源管「出力」。这就是所有自动控制的雏形。' },
      { speaker: 'xiaohan', text: '按键 → 基极电阻 → 基极；LED → 集电极。发射极接地！三条腿的活儿别搞混！' },
      { speaker: 'laozhou', text: '加一路光敏电阻替换按键，就是楼道的自动夜灯；加一路温度传感器，就是风扇温控。今天这个小电路，是千万产品的爷爷。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '按下就亮，松开就灭！你造出了第一个「输入→控制→输出」系统！' },
      { speaker: 'laozhou', text: '冷知识：按键控制三极管而不是直接带负载，还有个隐藏好处——按键触点不用承受大电流，寿命从几万次变成几百万次。细节里全是可靠性。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'SW1', type: 'button', x: 192, y: 96, locked: true },
        { id: 'R1', type: 'resistor', x: 320, y: 96, params: { resistance: 10000 }, locked: true },
        { id: 'Q1', type: 'npn', x: 448, y: 192, params: { beta: 100 }, locked: true },
        { id: 'R2', type: 'resistor', x: 576, y: 96, params: { resistance: 220 }, locked: true },
        { id: 'LED1', type: 'led', x: 576, y: 240, params: { vf: 2 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'SW1', port: 'a' } },
      { kind: 'connected', a: { comp: 'SW1', port: 'b' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'Q1', port: 'b' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R2', port: 'a' } },
      { kind: 'connected', a: { comp: 'R2', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'Q1', port: 'c' } },
      { kind: 'connected', a: { comp: 'Q1', port: 'e' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次点亮', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '这是两条回路：控制回路（电源→按键→R1→基极→发射极→地）和功率回路（电源→R2→LED→集电极→发射极→地）。',
      '两条回路共用发射极和电源。LED 电流 (5−2−0.2)/220 ≈ 12.7mA，基流 (5−0.7)/10k = 0.43mA 足够驱动。',
      '按 briefing 顺序连 7 条线，运行时按下 SW1（点击按键）LED 即亮。',
    ],
    knowledge: {
      title: '输入→控制→输出：系统的最小单元',
      body: '本关结构是嵌入式世界的标准模板：输入（按键）只负责提供微弱的控制信号，控制元件（三极管）负责放大与隔离，输出（LED）由电源直接供能。这个解耦带来三个工程红利：其一，控制回路电流极小（0.43mA），任何脆弱的传感器都驱动得起；其二，负载电压电流可以远超控制端规格；其三，一条控制信号未来可以换成 MCU 引脚、定时器、比较器——整个系统架构不变。饱和判据回顾：Ib = 0.43mA ≫ Ic/β = 0.13mA，三极管深度饱和，Vce ≈ 0.2V，LED 电流 (5−2−0.2)/220 ≈ 12.7mA。给基流留 3 倍以上裕量，是开关电路可靠性的第一原则。',
    },
    // 验算: Ib=(5−0.7)/10k=0.43mA；Ic(sat)=(5−2−0.2)/220=12.7mA ∈ [10,18]mA ✓；
    // 需 Ib≥12.7/100=0.127mA，0.43mA 裕量 3.4 倍，深度饱和 ✓
  },
];
