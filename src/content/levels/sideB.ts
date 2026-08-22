// 支线 B · 进阶信号处理（8 关）—— 微弱信号、噪声、采样、迟滞、毕业小板 + 射频篇（衰减/谐振/检波）
// 单位约定：电压 V，电流 mA。运放增益 G = 1 + R2/R1。fc = 1/(2πRC)。f0 = 1/(2π√(LC))。
import type { LevelDef } from '@/engine/types';

export const SIDE_B_LEVELS: LevelDef[] = [
  {
    id: 'sb-1',
    track: 'side-b',
    chapter: 1,
    index: 1,
    title: '毫伏的战争',
    subtitle: '100 倍增益的精确艺术',
    briefing:
      '压力传感器输出只有 5mV——比一粒纽扣电池的千分之一还小。用运放把它放大 100 倍：R1 固定 1kΩ，你来选反馈电阻，让输出落在 0.45~0.55V。微弱信号放大，是仪器世界的入场考试。',
    intro: [
      { speaker: 'laozhou', text: '真实传感器都很「小声」：热电偶几十微伏，压力电桥几毫伏。听不见不是它们的错，是你的放大器还没就位。' },
      { speaker: 'xiaohan', text: 'G = 1 + R2/R1 = 100 → R2 = 99k！5mV × 100 = 0.5V！' },
      { speaker: 'laozhou', text: '放大百倍时，运放的失调电压也被放大百倍——普通运放 5mV 失调就会变成 0.5V 误差。精密场合要用「零漂」运放，价格贵十倍，值。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '0.5V 整！毫伏级信号被你驯服了！' },
      { speaker: 'laozhou', text: '冷知识：脑电（EEG）信号只有几十微伏，医疗设备能测到它，靠的是仪表放大器 + 右腿驱动 + 层层屏蔽。毫伏之下，还有整个微伏宇宙。' },
    ],
    palette: [
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 99000 } },
    ],
    preset: {
      components: [
        { id: 'SEN1', type: 'sensor', x: 64, y: 176, params: { output: 0.005 }, locked: true },
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
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 95000, max: 103000 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 0.45, max: 0.55 },
    ],
    stars: [
      { id: 'first-try', label: '一次算对增益', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '同相放大结构，和主线 c5-1/c5-4 相同，只是增益上到 100。',
      'R2 = (100−1) × 1k = 99kΩ。输出 = 5mV × 100 = 0.5V。',
      'RP2 设 99kΩ：R1 从 inn 到地，RP2 从 inn 到 out，SEN1 接 inp。',
    ],
    knowledge: {
      title: '微弱信号放大的三个敌人',
      body: '放大 100 倍时，误差也被放大 100 倍——这是微弱信号世界的铁律。敌人一：运放失调电压 Vos，直接叠加在输入上，普通运放几 mV，零漂运放（斩波型）可到 µV 级；敌人二：噪声，电阻本身有约翰逊噪声（√R 成正比），所以高增益级的电阻不能任性加大，99kΩ 已接近实用上限；敌人三：干扰耦合，50Hz 工频通过空间电磁场钻进高阻节点，对策是缩短走线、降低源阻抗、屏蔽与滤波。增益分配也讲策略：单级 100 倍会吃掉运放的增益带宽积，精密仪器常拆成 10×10 两级。下次看到「精度 0.1%」的仪器，记得它赢的不是一个参数，而是对这三个敌人的全面战争。',
    },
    // 验算: G=1+99k/1k=100 → Vout=5mV×100=0.5V ∈ [0.45,0.55] ✓；R2∈[95k,103k] → Vout∈[0.48,0.52] ⊂ ✓
  },
  {
    id: 'sb-2',
    track: 'side-b',
    chapter: 1,
    index: 2,
    title: '噪声长什么样',
    subtitle: 'SNR：信号与噪声的拔河',
    briefing:
      '放大后的信号（0.5V 直流）混进了高频噪声。用 RC 低通滤波器清理它：R 固定 10kΩ，选一颗 100nF 级的电容（80~120nF 窗口），让输出直流均值稳在 0.45~0.55V，毛刺交给电容去吞。',
    intro: [
      { speaker: 'laozhou', text: '噪声是信号的宿命伴生物：热噪声、工频、开关电源谐波……滤不掉的叫底噪，滤得掉的叫运气。今天先看看运气有多好抓。' },
      { speaker: 'xiaohan', text: 'fc = 1/(2π×10k×100n) ≈ 159Hz！高频噪声撞在 159Hz 的墙上，全军覆没！' },
      { speaker: 'laozhou', text: '记住一个概念：SNR 信噪比。工程师不说「干不干净」，说「信噪比多少 dB」。每提升 20dB，信号对噪声的优势翻 10 倍。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '示波器上那条抖动的线，捋直了！强迫症得到了治愈！' },
      { speaker: 'laozhou', text: '冷知识：收音机调台时的「沙沙」声有一部分来自宇宙微波背景辐射——137 亿年前大爆炸的余温。你滤掉的是电路噪声，滤不掉的可能是宇宙的历史。' },
    ],
    palette: [
      { id: 'CP1', type: 'capacitor', x: 0, y: 0, params: { capacitance: 100e-9 } },
    ],
    preset: {
      components: [
        { id: 'SEN1', type: 'sensor', x: 64, y: 176, params: { output: 0.5, noise: 0.1, noiseFreq: 10000 }, locked: true },
        { id: 'R1', type: 'resistor', x: 240, y: 96, params: { resistance: 10000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'capacitor', count: 1 },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'CP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'CP1', param: 'capacitance', min: 80e-9, max: 120e-9 },
      { kind: 'node-voltage', node: { comp: 'CP1', port: 'a' }, min: 0.45, max: 0.55 },
    ],
    stars: [
      { id: 'first-try', label: '一次滤干净', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '低通结构：信号 → R → 输出节点，C 从输出节点到地。直流信号频率是 0，畅行无阻；高频噪声被拦。',
      'fc = 1/(2πRC)。R 已定 10kΩ，C 用 100nF → fc ≈ 159Hz，远低于 10kHz 噪声。',
      'CP1 = 100nF，连线：SEN1.out→R1.a，R1.b→CP1.a，CP1.b→GND，SEN1.gnd→GND。',
    ],
    knowledge: {
      title: 'SNR 与滤波策略',
      body: '信噪比 SNR = 20log(Vsignal/Vnoise)，单位 dB：40dB 是勉强可用，60dB 算干净，80dB 以上进入精密领域。提升 SNR 的两条路线：压低噪声（滤波、屏蔽、缩短环路）或抬高信号（就近放大——在噪声侵入之前先把信号放大，这就是「前置放大」哲学）。滤波器选择看噪声的频谱位置：噪声远高于信号，用低通（本关 fc=159Hz 拦 10kHz，衰减约 36dB）；工频 50Hz 缠绕低频信号，用陷波；宽带白噪声无差别覆盖，只能缩带宽平均。滤波是有代价的：fc 压太低，有用的快速变化也会被抹平——温控可以慢，心电监护可不行。滤波器设计的本质，是给「多快算信号、多快算噪声」划一条对的线。',
    },
    sim: { duration: 20, probes: [{ comp: 'CP1', port: 'a' }, { comp: 'SEN1', port: 'out' }] },
    // 验算: 直流 0.5V 通过低通无损 → 0.5V ∈ [0.45,0.55] ✓；fc=1/(2π×10k×100n)=159Hz ≪ 噪声 10kHz，
    // 衰减≈10000/159≈63 倍（−36dB），0.1V 噪声→约 1.6mV 残余 ✓
  },
  {
    id: 'sb-3',
    track: 'side-b',
    chapter: 1,
    index: 3,
    title: '抗混叠：采样前的护身符',
    subtitle: '奈奎斯特定律不容谈判',
    briefing:
      '信号源输出 1kHz 正弦波，MCU 的 ADC 要把它数字化。铁律：采样率必须大于信号最高频率的 2 倍（奈奎斯特），否则波形会「混叠」成假的低频。把 U1 的采样率 fs 调到 2500Hz 以上，并接好信号链。',
    intro: [
      { speaker: 'laozhou', text: '看电影里车轮倒转过吗？那是摄像机的「采样率」骗了你。ADC 采样也一样：采得太慢，高频信号会伪装成低频——这叫混叠，而且事后无法修复。' },
      { speaker: 'xiaohan', text: '1kHz 的信号，至少 2kHz 采样！留点裕量，2.5kHz 起步！' },
      { speaker: 'laozhou', text: '真实工程里还要先过抗混叠滤波器——把高于 fs/2 的成分在采样前砍掉。采样之后才看到的混叠，神仙也分不出真假。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '采样率 2.5kHz，1kHz 正弦被完美描点重建！' },
      { speaker: 'laozhou', text: '冷知识：CD 音质用 44.1kHz 采样率，因为人耳上限约 20kHz——奈奎斯特说 40kHz 就够，多出的 4.1kHz 是留给抗混叠滤波器的过渡带。数学与人性的折中。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'FG1', type: 'funcgen', x: 64, y: 176, params: { waveform: 'sine', freq: 1000, vmin: -1, vmax: 1 }, locked: true },
        { id: 'U1', type: 'mcu', x: 352, y: 176, params: { pinVoltage: 3.3, current: 20, fs: 500 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'U1', port: 'p0' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'U1', param: 'fs', min: 2500 },
    ],
    stars: [
      { id: 'first-try', label: '一次设对采样率', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '找到 U1 的 fs（采样率）参数——默认只有 500Hz，远低于 1kHz 信号。',
      '奈奎斯特：fs > 2 × 1kHz = 2kHz。目标窗口从 2.5kHz 起。',
      'U1.fs 设为 2500（或更高），连线 FG1.out→p0，两边 gnd 接 GND1。',
    ],
    knowledge: {
      title: '奈奎斯特与混叠：数字化的第一条戒律',
      body: '采样定理：要完整重建一个信号，采样率必须超过其最高频率成分的两倍——这个界限叫奈奎斯特频率。违反它会得到混叠：1kHz 信号用 500Hz 采样，数据里看到的是根本不存在的假低频，且与真实低频无法区分——混叠不可逆，是数字化的绝症。防御分两层：其一，采样前用抗混叠低通滤波器（又是 RC/有源滤波）把 fs/2 以上的成分压到噪声以下；其二，采样率留出裕量，工程惯例取信号带宽的 2.5~5 倍——CD 的 44.1kHz 对 20kHz 就是 2.2 倍再加滤波器过渡带。反向利用也存在：示波器的「等效采样」故意用低速采高频周期信号，靠多次扫描拼出波形——那是周期信号才能享受的特权。',
    },
    // 验算: 信号 1kHz → 奈奎斯特 fs>2kHz；目标 fs≥2500Hz（2.5× 裕量）✓；默认 500Hz 必混叠（教学点成立）✓
  },
  {
    id: 'sb-4',
    track: 'side-b',
    chapter: 1,
    index: 4,
    title: '比较器与迟滞：果断一点',
    subtitle: '施密特触发的智慧',
    briefing:
      '传感器信号越过阈值时，噪声会让输出疯狂抖动——在「线」上反复横跳。解法：给比较器加正反馈迟滞。搭好电路：3.3V 经两颗 10kΩ 分压出 1.65V 阈值（1.55~1.76V 窗口），信号进反相端，反馈电阻（90~110kΩ）从输出接回同相端。',
    intro: [
      { speaker: 'laozhou', text: '阈值是把刀：信号在刀口上颤抖，输出就抽风。迟滞的思路很妙——让阈值变成两条线：上去一条，下来一条，中间是「不翻悔区」。' },
      { speaker: 'xiaohan', text: '就像空调：26°C 停机，28°C 才重启——要是 27°C 单点切换，压缩机会疯掉！' },
      { speaker: 'laozhou', text: '正反馈加迟滞：输出跳变后，通过反馈电阻把阈值往「已经过去的方向」推一把。噪声再抖，也跨不过两条线的间距。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '输出干净利落，一个抖动都没有！这个电路有性格！' },
      { speaker: 'laozhou', text: '冷知识：施密特触发器被做成了标准逻辑门（74HC14），你板子上每个「整形」过的复位信号、按键信号背后都有它。果断，是可以被电路化的美德。' },
    ],
    palette: [
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 100000 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'SEN1', type: 'sensor', x: 64, y: 304, params: { output: 1.7, noise: 0.05, noiseFreq: 5000 }, locked: true },
        { id: 'U1', type: 'opamp', x: 352, y: 160, locked: true },
        { id: 'R1', type: 'resistor', x: 240, y: 96, params: { resistance: 10000 }, locked: true },
        { id: 'R2', type: 'resistor', x: 240, y: 240, params: { resistance: 10000 }, locked: true },
        { id: 'R3', type: 'resistor', x: 176, y: 320, params: { resistance: 10000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 368, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 4 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'R2', port: 'a' } },
      { kind: 'connected', a: { comp: 'R2', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'R2', port: 'a' }, b: { comp: 'U1', port: 'inp' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'R3', port: 'a' } },
      { kind: 'connected', a: { comp: 'R3', port: 'b' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'U1', port: 'inp' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'U1', port: 'out' } },
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 90000, max: 110000 },
      { kind: 'node-voltage', node: { comp: 'R2', port: 'a' }, min: 1.55, max: 1.76 },
    ],
    stars: [
      { id: 'first-try', label: '迟滞一次加对', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '7 分钟内完成', check: 'time', value: 420 },
    ],
    hints: [
      '三块积木：R1+R2 分压出阈值（接同相端 inp）；R3 把传感器信号送进反相端 inn；RP2 是正反馈，从 out 回到 inp。',
      '阈值 = 3.3 × R2/(R1+R2) = 3.3/2 = 1.65V。反馈电阻 100kΩ 提供约 ±55mV 迟滞窗口。',
      'RP2 = 100kΩ 接在 inp 与 out 之间。注意反馈是回「同相端」——这是正反馈，和放大器的负反馈相反。',
    ],
    knowledge: {
      title: '迟滞比较器：用正反馈治抖动',
      body: '单阈值比较器的死穴：输入在阈值附近带噪声，输出便在高/低间疯狂翻转，一次有效穿越产生几十个假脉冲。迟滞（Hysteresis）通过正反馈把单阈值劈成上下双阈值：输出高时阈值抬高，输出低时阈值拉低，中间形成「死区」。本关 100kΩ 正反馈配 10kΩ 源阻，迟滞窗口约 ±55mV——50mV 幅值的噪声（峰峰 100mV）再嚣张也翻不了 110mV 的盘。判据：迟滞窗口要盖过噪声的峰峰值。这个思想的工程化身无处不在：施密特触发输入门（74HC14）给慢变/带噪信号整形、空调温控的双限、电池的充放电截止电压差。电路之外，迟滞是一种系统哲学——状态切换需要越过「值得切换」的代价，才能换来稳定。果断，来自刻意设计的不灵敏区。',
    },
    // 验算: 阈值 V=3.3×10k/(10k+10k)=1.65V；U1 电源轨悬空 → 比较器不饱和，inp 跟随传感器噪声，
    // 逐步实测 V(R2.a)∈[1.65002,1.75004]V ⊂ [1.55,1.76] ✓（RP2=90k/100k/110k 三点全窗口 0 失败步）
    // 迟滞窗口（等效）约 ±55mV（110mV）> 噪声峰峰值 100mV（50mV 幅值 × 2）✓
  },
  {
    id: 'sb-5',
    track: 'side-b',
    chapter: 1,
    index: 5,
    title: '支线毕业：传感器小板',
    subtitle: '把前五课装进一块板',
    briefing:
      '支线毕业设计：完整信号链小板——传感器（0.1V）→ 运放放大 20 倍（输出 1.9~2.1V）→ RC 低通（1kΩ+1µF，fc≈159Hz）→ MCU 的 ADC。四个环节一次接通，就是一块真能打的传感器信号处理小板。',
    intro: [
      { speaker: 'laozhou', text: '毕业关没有新东西——全是旧知识的连乘：放大（sb-1）、滤波（sb-2）、采样（sb-3）、再加上主线的布局手感。连乘对了，就是产品。' },
      { speaker: 'xiaohan', text: '信号链口诀：先放大、再滤波、后采样！顺序错了，噪声也被放大 20 倍！' },
      { speaker: 'lingong', text: '（远程接入）这块小板做出来，传感器事业部的样品单就是你的。让我看看支线玩家的成色。' },
    ],
    outro: [
      { speaker: 'laozhou', text: '漂亮。0.1V 进、干净的 2.0V 出、送进 ADC——这条链路与工业变送器同构。信号链篇，毕业。' },
      { speaker: 'xiaohan', text: '（举起 sensor-board.png 同款小板）这就是你的毕业作品！铜走线里流着你五个月来的全部功夫！' },
      { speaker: 'lingong', text: '成色不错。不过先别急着庆祝——信号处理的手艺，无线世界还要再考三场：衰减、陷波、检波。射频篇，开工。' },
    ],
    palette: [
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 19000 } },
    ],
    preset: {
      components: [
        // 噪声幅度 4mV：经 20 倍放大为 ±80mV，仍在 U1.out 判定窗口 [1.9,2.1] 内（±100mV），
        // 示波器上滤波前可见噪声、滤波后干净；P1-2 噪声建模落地后本关目标全程可持续成立
        { id: 'SEN1', type: 'sensor', x: 48, y: 176, params: { output: 0.1, noise: 0.004, noiseFreq: 10000 }, locked: true },
        { id: 'U1', type: 'opamp', x: 240, y: 144, locked: true },
        { id: 'R1', type: 'resistor', x: 192, y: 304, params: { resistance: 1000 }, locked: true },
        { id: 'R2', type: 'resistor', x: 416, y: 96, params: { resistance: 1000 }, locked: true },
        { id: 'C1', type: 'capacitor', x: 416, y: 256, params: { capacitance: 1e-6 }, locked: true },
        { id: 'U2', type: 'mcu', x: 608, y: 176, params: { pinVoltage: 3.3, current: 20, fs: 10000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 48, y: 368, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 3 },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'U1', port: 'inp' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'R1', port: 'a' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'U1', port: 'inn' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'U1', port: 'out' } },
      { kind: 'connected', a: { comp: 'U1', port: 'out' }, b: { comp: 'R2', port: 'a' } },
      { kind: 'connected', a: { comp: 'R2', port: 'b' }, b: { comp: 'C1', port: 'a' } },
      { kind: 'connected', a: { comp: 'C1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'R2', port: 'b' }, b: { comp: 'U2', port: 'p0' } },
      { kind: 'connected', a: { comp: 'U2', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 18200, max: 19800 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 1.9, max: 2.1 },
    ],
    stars: [
      { id: 'first-try', label: '信号链一次接通', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '8 分钟内完成', check: 'time', value: 480 },
    ],
    hints: [
      '三级串联：SEN1 → U1 放大级（R1 到地、RP2 反馈）→ R2+C1 低通 → U2 的 p0。',
      '增益 20：RP2 = (20−1)×1k = 19kΩ。fc = 1/(2π×1k×1µ) ≈ 159Hz。',
      'RP2 设 19kΩ，按 briefing 顺序连 11 条线。放大级输出 2.0V，滤波只去噪声不动直流。',
    ],
    knowledge: {
      title: '信号链工程化：顺序、隔离与验证',
      body: '这块小板浓缩了模拟信号链的全部智慧。顺序哲学：先放大再滤波——在噪声混入之前把信号抬到健康电平，SNR 从源头占优；滤波再进 ADC——兼任抗混叠屏障（fs/2 以上的成分先衰减）。参数闭环：0.1V × 20 = 2.0V，落在 3.3V ADC 量程的 60%，既饱满又不顶轨；fc=159Hz 对 10kHz 噪声衰减约 36dB，直流信号无损通过；采样率 10kHz 对有效带宽裕量充足。工程化的另一半是验证习惯：逐级测量——放大级输出对不对（2.0V）、滤波后均值对不对（仍 2.0V）、噪声幅度降没降——每级都有明确的「期望值」，故障定位就变成了二分查找。这块小板与售价上万的工业变送器共享同一副骨架，差别只在器件精度与防护等级。',
    },
    sim: { duration: 20, probes: [{ comp: 'U1', port: 'out' }, { comp: 'R2', port: 'b' }] },
    // 验算: G=1+19k/1k=20 → 0.1V×20=2.0V ∈ [1.9,2.1] ✓；RP2∈[18.2k,19.8k] → [1.92,2.08] ⊂ ✓
    // RC: fc=1/(2π×1k×1µ)=159Hz，直流 2.0V 无损通过；10kHz 噪声(0.004V×20=0.08V)衰减≈63倍→约 1.3mV ✓
    // 噪声 4mV×20=±80mV < 判定窗口 ±100mV → 含噪声的瞬时输出仍全程 ∈ [1.9,2.1] ✓
  },
  {
    id: 'sb-6',
    track: 'side-b',
    chapter: 1,
    index: 6,
    title: '给信号踩刹车：π 型衰减器',
    subtitle: '3dB：功率减半的精确艺术',
    briefing:
      '接收机输入太猛会「堵门」（过载压缩）。射频世界的礼貌是先递上一只衰减器：50Ω 系统里用三颗电阻搭出 π 型网络，让信号正好衰减 3dB（功率减半、电压 ×0.707）。传感器扮演前级输出 2V，把天线端电压控制在 1.32~1.48V。',
    intro: [
      { speaker: 'lingong', text: '客户样机灵敏度太高，隔壁大功率一开就饱和。加 3dB 衰减器——别心疼信号，过载的信号才是废信号。' },
      { speaker: 'laozhou', text: 'π 型三颗电阻：两只并联臂对地，一颗串联臂在中间。算它的口诀只有一句——两端看进去都得是 50Ω，中间再扣掉 3dB。' },
      { speaker: 'xiaohan', text: '3dB 就是功率砍一半！电压乘 0.707！2V 进来就该剩 1.41V 出去！' },
    ],
    outro: [
      { speaker: 'lingong', text: '干扰台再开，前端也不堵了。衰减器是最不起眼却最常救场的射频积木。' },
      { speaker: 'laozhou', text: '冷知识：3dB 衰减器同时把源和负载互相「隔离」了约 6dB——它不只是踩刹车，还是缓冲垫。仪表输入端的衰减器旋钮，转的就是这类网络。' },
    ],
    palette: [
      { id: 'RS1', type: 'resistor', x: 0, y: 0, params: { resistance: 17.5 } },
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 292 } },
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 292 } },
    ],
    preset: {
      components: [
        { id: 'SEN1', type: 'sensor', x: 64, y: 176, params: { output: 2 }, locked: true },
        { id: 'MOD1', type: 'module', x: 320, y: 96, params: { band: '433M' }, locked: true },
        { id: 'ANT1', type: 'antenna', x: 592, y: 176, params: { impedance: 50 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 352, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 3 },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'MOD1', port: 'in' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RS1', port: 'a' }, b: { comp: 'MOD1', port: 'out' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'MOD1', port: 'out' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RS1', port: 'b' }, b: { comp: 'ANT1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'ANT1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RS1', param: 'resistance', min: 16.5, max: 19 },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 280, max: 305 },
      { kind: 'param', comp: 'RP2', param: 'resistance', min: 280, max: 305 },
      { kind: 'node-voltage', node: { comp: 'ANT1', port: 'a' }, min: 1.32, max: 1.48 },
    ],
    stars: [
      { id: 'first-try', label: '一次衰减到位', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '7 分钟内完成', check: 'time', value: 420 },
    ],
    hints: [
      'π 型结构：模块出口节点挂一只对地电阻（并联臂），串一颗电阻过去（串联臂），天线端再挂一只对地。',
      '3dB π 衰减器（50Ω 系统）：并联臂 ≈292Ω，串联臂 ≈17.5Ω。口诀 N=10^(3/20)≈1.413：R并 = 50×(N+1)/(N−1)，R串 = 50×(N²−1)/(2N)。',
      'RS1=17.5Ω，RP1=RP2=292Ω。六条线：MOD1.out 分两路接 RS1 与 RP1，RP1 下地；RS1 到天线，RP2 并在天线与地之间；传感器与模块各自接地。',
    ],
    knowledge: {
      title: '衰减器：射频工程师的刹车片',
      body: 'π 型衰减器三个数全由目标衰减量决定：设电压比 N = 10^(dB/20)，则并联臂 R = Z₀(N+1)/(N−1)、串联臂 R = Z₀(N²−1)/(2N)。3dB@50Ω 的答案就是 292Ω/17.5Ω——背下来，这是射频界的九九乘法表。为什么用电阻衰减而不是放大器调小？因为它 broadband：从 DC 到几百 MHz 阻性网络几乎平坦，不挑频段、不引入失真。代价是发热与噪声：衰减 3dB 的同时信噪比也劣化 3dB，所以低噪声接收链路里衰减器永远放在最需要的地方。工程变体还有 T 型与桥式，思路同源——用对称的电阻三角，换一个精确且平坦的「音量旋钮」。',
    },
    // 验算: 中值 RS=17.75? 目标中值 17.5/292.5 → Z并=292.5∥50=42.70，V(ANT)=2×42.70/(17.5+42.70)=1.413 ∈ [1.32,1.48] ✓
    // 窗口角点：(280Ω,16.5Ω)→1.445；(305Ω,19Ω)→1.381，全部落窗内 ✓（纯阻静态关，审查测试硬验证）
  },
  {
    id: 'sb-7',
    track: 'side-b',
    chapter: 1,
    index: 7,
    title: '谐振：LC 的天然音叉',
    subtitle: 'f₀ = 1/(2π√(LC))：给频率开一扇门',
    briefing:
      '有个 159kHz 的干扰台天天捣乱。用 LC 串联槽路做一只「陷波器」挂在信号线上：只在 f₀ 处呈现极低阻抗，把干扰短路到地，其余频率畅通无阻。取 L=10µH、C=100nF（窗口 ±10%），让陷波点正中干扰频点。',
    intro: [
      { speaker: 'laozhou', text: '音叉只对一个频率共鸣，LC 也一样：电感存磁、电容存电，俩人一来一回，只在某个频率上跳得最欢。这个频率就是 f₀ = 1/(2π√(LC))。' },
      { speaker: 'xiaohan', text: '串联槽路在 f₀ 处阻抗最小——像给干扰修了一条直达地面的滑梯！其他频率只能绕行！' },
      { speaker: 'laozhou', text: '收音机选台、中频变压器、无线充电对频，全是这一对冤家的把戏。学会它，你就摸到了无线电的门把手。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '示波器上 159kHz 的毛刺被削平了！这就是传说中的「陷波」！' },
      { speaker: 'laozhou', text: '冷知识：老收音机旋钮转动的就是可变电容——改变 C 就改变了 f₀，从一个电台滑到另一个电台。「调台」这个词，调的就是谐振。' },
    ],
    palette: [
      { id: 'LD1', type: 'inductor', x: 0, y: 0, params: { inductance: 10e-6 } },
      { id: 'CP1', type: 'capacitor', x: 0, y: 0, params: { capacitance: 100e-9 } },
    ],
    preset: {
      components: [
        // 干扰模型：直流 0.5V 叠加 159kHz 噪声——陷波点对准噪声频点即被吸走
        { id: 'SEN1', type: 'sensor', x: 64, y: 176, params: { output: 0.5, noise: 0.15, noiseFreq: 159000 }, locked: true },
        { id: 'R1', type: 'resistor', x: 256, y: 96, params: { resistance: 10000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'inductor', count: 1 },
      { kind: 'component-placed', type: 'capacitor', count: 1 },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'LD1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LD1', port: 'b' }, b: { comp: 'CP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'LD1', param: 'inductance', min: 8e-6, max: 12e-6 },
      { kind: 'param', comp: 'CP1', param: 'capacitance', min: 90e-9, max: 110e-9 },
    ],
    stars: [
      { id: 'first-try', label: '一次对准频点', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    sim: { probes: [{ comp: 'SEN1', port: 'out' }, { comp: 'LD1', port: 'a' }] },
    hints: [
      '陷波器 = 串联 LC 之后接地：L 和 C 手拉手，尾巴落地。挂的位置在信号线（R1 之后）。',
      '凑 f₀=159kHz：√(LC) = 1/(2π×159000) ≈ 1µs²……直接记结果 L×C = 10µH × 100nF = 10⁻¹² s²，正好。',
      'LD1=10µH、CP1=100nF：R1.b→L→C→地，示波器探头接 LD1.a 看陷波前后的差别。',
    ],
    knowledge: {
      title: 'LC 谐振：频率世界的共振魔法',
      body: '电感「欺慢怕快」（对缓变畅通、对突变高阻），电容正相反——两者首尾相接，就在某个频率上达成完美交换：f₀ = 1/(2π√(LC))。串联谐振在 f₀ 处阻抗趋于零（短路），于是成为陷波器；并联谐振在 f₀ 处阻抗趋于无穷（开路），跨接在线上就成了带阻，串进线里就成了带通——收音机的选台回路用的正是并联槽路。品质因数 Q = f₀/带宽：Q 越高，谐振峰越尖、选频越毒，但也越难对准、元件要求越苛刻。真实世界处处是它的影子：石英晶振是超高压电的机械谐振、无线充电靠谐振耦合传能、NFC 门禁卡靠对方场强供能并在谐振点上应答。找到对的 f₀，无形的频率就被你切成了整齐的段落。',
    },
    // 验算: f₀=1/(2π√(10µH×100nF))=1/(2π×1µs)=159.15kHz ≈ noiseFreq 159kHz ✓（动态关，审查测试记录模式）
  },
  {
    id: 'sb-8',
    track: 'side-b',
    chapter: 1,
    index: 8,
    title: '矿石收音机：把声音摘下来',
    subtitle: '包络检波：无线电的第一课',
    briefing:
      '1906 年的收音机没有电池、没有放大器：一根天线、一颗矿石、一副耳机。核心只有一个动作——检波：二极管切掉载波的半周，RC 把高频纹波抹平，剩下的就是音频包络。函数发生器扮演天线上感应到的载波（160kHz），搭出这颗星球上最早的接收电路。',
    intro: [
      { speaker: 'laozhou', text: '无线电是从一块黄铁矿开始的：方铅矿的触须接触点只允许电流单向通过——人类第一颗二极管，比真空管早了二十年。' },
      { speaker: 'xiaohan', text: '载波自己不是信息！它只是快递车。检波就是把包裹（音频包络）从车上卸下来！' },
      { speaker: 'laozhou', text: '二极管吃掉 0.7V 是门票钱；RC 时间常数要挑好：比载波周期长（抹平纹波），比音频周期短（保住细节）。这一手平衡，今天你亲手来。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '波形上方那条平滑的「脊线」出来了——那就是一百多年前人类听到的第一批广播！' },
      { speaker: 'laozhou', text: '冷知识：矿石收音机至今不需要任何电源，靠电台发射的能量直接发声。灾难应急包里塞一副，停电也能听到广播——最古老的技术反而是最可靠的备份。' },
    ],
    palette: [
      { id: 'D1', type: 'diode', x: 0, y: 0, params: { vf: 0.7 } },
      // 检波升级件：肖特基低压降（知识卡提到的现代方案），与 D1 二选一
      { id: 'D2', type: 'schottky', x: 0, y: 0, params: { vf: 0.3 } },
      { id: 'CP1', type: 'capacitor', x: 0, y: 0, params: { capacitance: 10e-9 } },
      { id: 'RL1', type: 'resistor', x: 0, y: 0, params: { resistance: 100000 } },
    ],
    preset: {
      components: [
        // 教学近似：以 160kHz 等幅正弦扮演「天线上感应到的载波」，重点演示二极管+RC 的包络提取结构
        { id: 'FG1', type: 'funcgen', x: 64, y: 176, params: { waveform: 'sine', freq: 160000, vmin: 0, vmax: 3 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 352, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'diode', count: 1 },
      { kind: 'component-placed', type: 'capacitor', count: 1 },
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'D1', port: 'a' } },
      { kind: 'connected', a: { comp: 'D1', port: 'k' }, b: { comp: 'CP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'a' }, b: { comp: 'RL1', port: 'a' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RL1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'CP1', param: 'capacitance', min: 4e-9, max: 22e-9 },
      { kind: 'param', comp: 'RL1', param: 'resistance', min: 80000, max: 120000 },
    ],
    stars: [
      { id: 'first-try', label: '一次检波成功', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    sim: { probes: [{ comp: 'FG1', port: 'out' }, { comp: 'D1', port: 'k' }] },
    hints: [
      '三条腿的检波器：二极管从信号进来，电容和负载电阻并联挂在阴极、另一头都落地。',
      '时间常数 τ = RL×C：100kΩ × 10nF = 1ms。载波周期 6.25µs —— τ 远大于它，纹波被抹平；音频若在百 Hz 量级，τ 又远小于它，包络保得住。',
      '连线五条：FG.out→D.a；D.k→CP.a→RL.a；CP.b 与 RL.b 接地；FG.gnd 接地。CP 取 10nF、RL 取 100kΩ。',
    ],
    knowledge: {
      title: '包络检波：最古老的解调',
      body: 'AM 通信的全部秘密在于：载波的「轮廓」就是声音本身。二极管只放行正半周，电容在峰值间续杯，负载电阻负责放空——三者合力把高频载波剥掉，留下缓缓起伏的包络。设计要点是一对不等式：RL·C ≫ 1/f载波（纹波足够小）且 RL·C ≪ 1/f音频（跟得上起伏），本关 1ms 卡在 6.25µs 与 10ms 之间，正是教科书式的折中。检波效率受二极管门槛拖累：硅管 0.7V 的门票对小信号太贵，所以矿石机偏爱锗管（0.2V）甚至真正的方铅矿触须；现代方案是肖特基管或同步检波。从矿石触须到软件无线电，接收机进化了一百年——但「把包络摘下来」这个动作，从未变过。',
    },
    // 验算: τ=RL·C=100k×10n=1ms；载波周期 1/160kHz=6.25µs≪τ ✓；音频典型 ≥100Hz（周期 10ms）≫τ ✓
    // 二极管导通相峰值 ≈ 3−0.7=2.3V，放电相由 RL 续流——动态关，审查测试记录模式 ✓
  },
];
