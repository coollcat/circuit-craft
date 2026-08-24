// 第 5 章 · 信号处理（4 关）—— 运放、有源滤波、ADC、传感器信号链
// 单位约定：电压 V，电流 mA。运放增益 G = 1 + R2/R1（同相放大）。
import type { LevelDef } from '@/engine/types';

export const C5_LEVELS: LevelDef[] = [
  {
    id: 'c5-1',
    track: 'main',
    chapter: 5,
    index: 1,
    title: '运放入门：虚短与虚断',
    subtitle: '增益由你设定',
    briefing:
      '传感器送来 0.2V 的微弱信号，后级 ADC 却需要 2V 左右的幅度。用运放搭一个同相放大器：R1 已固定 1kΩ（接到地），你来选反馈电阻 R2，让输出落在 1.9~2.1V。增益公式：G = 1 + R2/R1。',
    intro: [
      { speaker: 'laozhou', text: '运算放大器，模拟电路的瑞士军刀。记住两条「虚」：虚短——两个输入端电压相等；虚断——输入端不吸电流。所有运放电路的分析都从这两条出发。' },
      { speaker: 'xiaohan', text: '同相放大：信号进 + 端，R1 接地、R2 从输出接回 − 端。增益 = 1 + R2/R1！0.2V × 10 = 2V！' },
      { speaker: 'laozhou', text: '注意反馈永远从输出接回反相端——负反馈。接错到同相端，运放立刻变成发疯的比较器，输出直接顶到电源轨。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '0.2V 进去，2.0V 出来！整整 10 倍，分毫不差！' },
      { speaker: 'laozhou', text: '冷知识：运放的开环增益高达 10 万倍，但我们故意用负反馈把它「压」到 10 倍——牺牲增益，换来精确、稳定、不挑个体。这是模拟设计最深的哲学：用过剩换确定。' },
    ],
    palette: [
      // 反馈电阻手写落位：从运放上方馈入 inn，与 R1 的下方馈线上下分离
      { id: 'RP2', type: 'resistor', x: 232, y: 56, params: { resistance: 9000 } },
    ],
    preset: {
      components: [
        { id: 'VS1', type: 'vsrc', x: 64, y: 176, params: { voltage: 0.2 }, locked: true },
        { id: 'U1', type: 'opamp', x: 320, y: 160, locked: true },
        { id: 'R1', type: 'resistor', x: 256, y: 320, params: { resistance: 1000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'connected', a: { comp: 'VS1', port: 'pos' }, b: { comp: 'U1', port: 'inp' } },
      { kind: 'connected', a: { comp: 'VS1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'R1', port: 'a' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'U1', port: 'out' } },
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 8600, max: 9400 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 1.9, max: 2.1 },
    ],
    stars: [
      { id: 'first-try', label: '一次算对增益', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '要 10 倍增益：G = 1 + R2/R1 = 10，R1 已经是 1kΩ。',
      'R2 = (G−1) × R1 = 9 × 1k = 9kΩ。输出 = 0.2V × 10 = 2.0V。',
      'RP2 设 9kΩ：R1 从 inn 接地，RP2 从 inn 接回 out，VS1 接 inp。负反馈回路一个都不能少。',
    ],
    knowledge: {
      title: '虚短虚断：运放分析的总开关',
      body: '理想运放配合负反馈时呈现两条黄金法则：虚短——输出会拼命调整，直到两个输入端电压相等；虚断——输入阻抗无穷大，输入端不取电流。用它们推导同相放大器只要三步：inn 被虚短钳位到 Vin；R1 上电流 = Vin/R1（虚断，电流全部流过 R2）；R2 压降叠加后输出 Vout = Vin × (1 + R2/R1)。增益只由电阻比决定，与运放个体差异无关——这正是负反馈的意义。两个工程提醒：输出不可能超过电源轨（±15V 运放送不出 20V）；增益别贪大，运放的「增益带宽积」有限，增益越高能放大的频率越低。下一关的有源滤波，就是这两条法则的延伸。',
    },
    // 验算: G=1+9k/1k=10 → Vout=0.2×10=2.0V ∈ [1.9,2.1] ✓；R2∈[8.6k,9.4k] → Vout∈[1.92,2.08] ⊂ [1.9,2.1] ✓
  },
  {
    id: 'c5-2',
    track: 'main',
    chapter: 5,
    index: 2,
    title: '有源滤波：只留下想要的频率',
    subtitle: 'RC + 运放 = 会思考的滤波器',
    briefing:
      '1kHz 方波混着你不需要的跳变沿。这次给 RC 低通（16kΩ + 1µF，fc≈10Hz ≪ 1kHz 信号）加一级运放缓冲，让滤波器带得起负载。接好 RC → 运放跟随器链路，输出直流均值落在 2.3~2.7V。',
    intro: [
      { speaker: 'laozhou', text: '无源 RC 滤波有个老毛病：一接负载，截止频率就漂移。解法是给 RC 后面跟一级运放缓冲——它输出电阻几乎为零，谁来接都不怕。' },
      { speaker: 'xiaohan', text: '跟随器 = 增益为 1 的放大器：输出直接接回反相端！「电压搬运工」，只出力不改数！' },
      { speaker: 'laozhou', text: 'fc = 1/(2πRC) = 1/(2π×16k×1µ) ≈ 10Hz，远低于 1kHz 信号——跳变沿被彻底抹平，输出只剩平均值。滤波不是只有「过」与「不过」，衰减多少倍，全看频率离 fc 多远。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '输出又稳又干净！带多少负载都不塌！' },
      { speaker: 'laozhou', text: '冷知识：把电阻电容位置互换就变成高通；两阶 RC 加运放就是著名的 Sallen-Key 滤波器，滚降翻倍到 −40dB/十倍频。音响分频器里全是它。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'FG1', type: 'funcgen', x: 64, y: 176, params: { waveform: 'square', freq: 1000, vmin: 0, vmax: 5, duty: 0.5 }, locked: true },
        { id: 'R1', type: 'resistor', x: 224, y: 96, params: { resistance: 16000 }, locked: true },
        { id: 'C1', type: 'capacitor', x: 224, y: 272, params: { capacitance: 1e-6 }, locked: true },
        { id: 'U1', type: 'opamp', x: 448, y: 160, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'C1', port: 'a' } },
      { kind: 'connected', a: { comp: 'C1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'U1', port: 'inp' } },
      { kind: 'connected', a: { comp: 'U1', port: 'out' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 2.3, max: 2.7 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次完成', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '两级结构：FG1 → R1 → C1（到地）完成低通；C1 上的电压送进运放 inp，运放 out 直接回接 inn 构成跟随器。',
      '方波 0~5V、50% 占空比，经过 fc≈10Hz 的低通后（≪ 1kHz 信号），跳变沿被衰减约百倍，输出贴着平均值。',
      '平均 = 5 × 0.5 = 2.5V。注意 τ=16k×1µ=16ms ≫ 半周期 0.5ms，电容只来得及微微起伏，输出是 2.5V 上 ±40mV 以内的细微波纹。',
    ],
    knowledge: {
      title: '有源滤波：给滤波器装上发动机',
      body: '无源 RC 滤波器的输出阻抗高，负载一接，等效 R 改变、fc 漂移、幅度塌陷。运放缓冲器（电压跟随器）完美解决这个问题：输入阻抗无穷大，不拖累 RC；输出阻抗接近零，带载能力强。两者组合就是有源滤波的基本单元。fc = 1/(2π×16k×1µF) ≈ 10Hz，远低于 1kHz 信号：方波基波被衰减约百倍（−40dB），谐波更重，输出是均值 2.5V 上 ±40mV 以内的细微波纹。进阶知识：单级 RC 滚降 −20dB/十倍频，级联两级加运放（Sallen-Key 结构）达 −40dB，想要「砖墙」滤波就上高阶。音频、传感器、通信接收机，处处都是有源滤波的舞台。',
    },
    sim: { duration: 20, probes: [{ comp: 'U1', port: 'out' }, { comp: 'FG1', port: 'out' }] },
    // 验算: fc=1/(2π×16k×1µ)=9.95Hz ≪ 1kHz 信号；τ=16ms ≫ 半周期 0.5ms，
    // 稳态收敛 [2.461,2.539]V ⊂ [2.3,2.7]V ✓（实测纹波 ±39mV ≈ 理论 (T/2)/τ×2.5 ≈ 78mVpp），可持续 700ms 以上 ✓
  },
  {
    id: 'c5-3',
    track: 'main',
    chapter: 5,
    index: 3,
    title: '采样与 ADC：把世界切成数字',
    subtitle: '电位器与 2.5V 的约定',
    briefing:
      'MCU 的 ADC 引脚等着读一个模拟电压。用电位器（10kΩ）搭一个 0~5V 可调分压，把抽头调到正中——让 ADC 引脚电压落在 2.3~2.7V，模拟一次「传感器标定」。',
    intro: [
      { speaker: 'laozhou', text: '世界是模拟的，芯片是数字的。ADC 就是翻译官：把 0~5V 的电压翻译成 0~4095 的数字。12 位 ADC，每一小格 1.22mV。' },
      { speaker: 'xiaohan', text: '电位器就是一个「徒手版分压器」！旋钮一转，抽头位置变了，比例跟着变！转到正中间就是一半！' },
      { speaker: 'laozhou', text: '2.5V 对应数字 2048，正好是量程中点。传感器标定、零点校准，干的都是「调到正中间」这件事。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '读数 2048！完美中点！ADC 第一次开口说话！' },
      { speaker: 'laozhou', text: '冷知识：ADC 读数跳动几个字是正常的——那叫量化噪声。工程师的对策：多读几次取平均，或者加一颗小电容滤波。数字世界的「稳」，都是平均出来的。' },
    ],
    palette: [
      { id: 'RP1', type: 'pot', x: 0, y: 0, params: { resistance: 10000, wiper: 0.5 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'U1', type: 'mcu', x: 448, y: 176, params: { pinVoltage: 5, current: 5 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'pot', count: 1 },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'w' }, b: { comp: 'U1', port: 'p0' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RP1', param: 'wiper', min: 0.45, max: 0.55 },
      { kind: 'node-voltage', node: { comp: 'RP1', port: 'w' }, min: 2.3, max: 2.7 },
    ],
    stars: [
      { id: 'first-try', label: '一次调到位', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '电位器三个脚：a、b 接电源两端，w（抽头）输出分压。wiper 参数就是抽头位置（0~1）。',
      '要 2.5V，即一半：wiper = 0.5。允许 0.45~0.55 的微调空间。',
      'RP1.a→BT1.pos，RP1.b→GND，RP1.w→U1.p0，wiper 设 0.5。输出 = 5 × 0.5 = 2.5V。',
    ],
    knowledge: {
      title: 'ADC 与分辨率直觉',
      body: 'ADC（模数转换器）把连续电压量化成数字：N 位 ADC 把满量程分成 2^N 份。5V 量程的 12 位 ADC，每份 1.22mV——这就是分辨率，再小的变化它「看不见」。读数公式：code = V ÷ Vref × (2^N − 1)，本关 2.5V 对应约 2047。三个工程直觉：其一，量化本身引入 ±0.5 LSB 的固有误差，想更准只能靠更高位数或更低参考电压；其二，参考电压 Vref 的精度直接决定一切读数的精度，所以精密测量用外部基准芯片；其三，被测信号源内阻要远小于 ADC 输入要求（常见 <10kΩ），否则采样瞬间充不满内部电容，读数偏低——电位器正中时输出内阻 2.5kΩ，恰好安全。',
    },
    // 验算: V_w = 5V × wiper；wiper=0.5 → 2.5V ∈ [2.3,2.7] ✓；wiper∈[0.45,0.55] → V∈[2.25,2.75]，
    // 与 [2.3,2.7] 交集要求 wiper∈[0.46,0.54] —— 提示引导玩家设 0.5±0.04，判定 param wiper∈[0.45,0.55] 且 node∈[2.3,2.7] 同时满足 ✓
  },
  {
    id: 'c5-4',
    track: 'main',
    chapter: 5,
    index: 4,
    title: '传感器信号链：从物理量到电压',
    subtitle: '章底综合：0.1V → 2.0V 的旅程',
    briefing:
      '章底大考，林工带来第一笔真订单：温度传感器输出仅 0.1V，而采集端需要 2.0V 满幅。设计完整信号链——传感器 → 同相放大（R1=1kΩ 已定）→ 输出。选好反馈电阻，让最终输出落在 1.9~2.1V。',
    intro: [
      { speaker: 'lingong', text: '你好，我是林工。客户要一批温度监测节点，传感器输出只有 0.1V，直接进 ADC 等于用望远镜看蚂蚁。帮我放大 20 倍，下周要样机。' },
      { speaker: 'laozhou', text: '真实世界的信号链都是这个套路：传感器出小信号 → 放大 → （滤波） → ADC。今天先练第一棒。' },
      { speaker: 'xiaohan', text: 'G = 1 + R2/R1 = 20，R1 是 1k……R2 = 19k！0.1 × 20 = 2.0V！' },
    ],
    outro: [
      { speaker: 'lingong', text: '输出 2.0V，线性漂亮。第一棒合格——滤波和 ADC 的部分，我们第 5 章剩下的课接着谈。' },
      { speaker: 'laozhou', text: '冷知识：传感器输出 0.1V 时，导线上的工频干扰可能就有 50mV。真实项目里放大之前先想屏蔽——这就是第 6 章和支线 B 要教你的。' },
    ],
    palette: [
      // 反馈电阻手写落位（同 c5-1）：上方馈入 inn
      { id: 'RP2', type: 'resistor', x: 232, y: 56, params: { resistance: 19000 } },
    ],
    preset: {
      components: [
        { id: 'SEN1', type: 'sensor', x: 64, y: 176, params: { output: 0.1 }, locked: true },
        { id: 'U1', type: 'opamp', x: 320, y: 160, locked: true },
        { id: 'R1', type: 'resistor', x: 256, y: 320, params: { resistance: 1000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'U1', port: 'inp' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'R1', port: 'a' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'U1', port: 'out' } },
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 18200, max: 19800 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 1.9, max: 2.1 },
    ],
    stars: [
      { id: 'first-try', label: '一次算对增益', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '和 c5-1 是同一个电路，只是增益目标变成 20 倍。',
      'R2 = (20 − 1) × 1k = 19kΩ。输出 = 0.1V × 20 = 2.0V。',
      'RP2 设 19kΩ，接法同 c5-1：R1 从 inn 到地，RP2 从 inn 到 out，传感器出信号进 inp。',
    ],
    knowledge: {
      title: '信号链：模拟世界的流水线',
      body: '一条完整的传感器信号链有标准工位：传感器把物理量变成微弱电压 → 放大器抬升幅度 → 滤波器清理噪声 → ADC 数字化。设计的核心是「逐级匹配」：放大倍数要让信号摆满 ADC 量程的大半（0.1V 放大 20 倍到 2V，用满 3.3V 量程的 60%），既不留太多浪费，也不顶到饱和；传感器输出阻抗、运放输入阻抗、ADC 采样阻抗，相邻两级都要「前低后高」才不打架。增益分配的学问：单级放大别超过 50 倍，增益带宽积有限的运放会在高频丢增益；需要大放大时拆两级，每级 √ 总增益，带宽和精度都更好。这套流水线思维，是仪器、医疗、工业控制的共同语言。',
    },
    // 验算: G=1+19k/1k=20 → Vout=0.1×20=2.0V ∈ [1.9,2.1] ✓；R2∈[18.2k,19.8k] → Vout∈[1.92,2.08] ⊂ [1.9,2.1] ✓
  },
];
