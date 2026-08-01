// 第 2 章 · 认识元器件（4 关）—— R/C/L/二极管/三极管特性小实验
// 单位约定：电压 V，电流 mA。二极管 Vf=0.7V，NPN Vbe=0.7V、Vce(sat)=0.2V、β=100。
import type { LevelDef } from '@/engine/types';

export const C2_LEVELS: LevelDef[] = [
  {
    id: 'c2-1',
    track: 'main',
    chapter: 2,
    index: 1,
    title: '电容：会存电的小水桶',
    subtitle: '时间常数 τ = RC',
    briefing:
      '认识电容的第一步：看它充电。5V 电源、10kΩ 电阻、100µF 电容都在台上，把它们串成一条 RC 充电回路，运行仿真观察电容两端电压慢慢爬升——充到 3.9V 以上即达标。',
    intro: [
      { speaker: 'laozhou', text: '电容是电路里的水桶：电流往里灌，水位（电压）慢慢涨。灌水的速度由谁决定？电阻 R 和容量 C 的乘积——我们叫它时间常数 τ。' },
      { speaker: 'xiaohan', text: '10kΩ × 100µF = 1 秒！等个一两秒，电压就爬上来了！' },
      { speaker: 'laozhou', text: '充电曲线是指数形的：一个 τ 充到 63%，五个 τ 才算基本充满。这条曲线你以后会在示波器上看见一万次。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '看到没！电压不是跳上去的，是爬上去的！这就是电容的脾气！' },
      { speaker: 'laozhou', text: '冷知识：相机闪光灯靠电容瞬间放电，主板上的去耦电容靠它稳住电压。同一个「水桶」，既能当水塔也能当缓冲池。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'R1', type: 'resistor', x: 272, y: 96, params: { resistance: 10000 }, locked: true },
        { id: 'C1', type: 'capacitor', x: 272, y: 256, params: { capacitance: 100e-6 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 320, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'C1', port: 'a' } },
      { kind: 'connected', a: { comp: 'C1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'node-voltage', node: { comp: 'C1', port: 'a' }, min: 3.9, max: 5.2 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次完成', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '电容充电需要一条完整回路：电源 → 电阻 → 电容 → 地。电阻决定充电快慢。',
      '把 R1 串在 BT1 正极和 C1 之间，C1 另一端接地，电池负极也接地。',
      '连线：BT1.pos→R1.a，R1.b→C1.a，C1.b→GND1，BT1.neg→GND1。运行后等约 2 秒电压即超过 3.9V。',
    ],
    knowledge: {
      title: 'RC 充电与时间常数 τ',
      body: '电容储存电荷，充放电遵循指数规律：Vc(t) = V × (1 − e^(−t/τ))，其中 τ = R × C 称为时间常数。本关 τ = 10kΩ × 100µF = 1 秒，意味着 1 秒后电压充到电源的 63%，2 秒到 86%，5 秒后（5τ）达到 99% 以上，工程上视为充满。τ 是电路世界的「惯性」度量：R 越大进水口越小，C 越大水桶越深，充满就越慢。这个简单公式统治着无数应用——定时器、上电复位、按键消抖、滤波器，甚至 DRAM 的刷新周期，本质都是 RC 的充放节奏。记住 63% 和 5τ 这两个数，你就掌握了预判任何 RC 电路速度的钥匙。',
    },
    sim: { duration: 6000, probes: [{ comp: 'C1', port: 'a' }] },
    // 验算: τ=RC=10k×100µ=1s；Vc(t)=5(1−e^(−t))，t=1.61s 时 Vc=4.0V>3.9V，t≥2s 后稳定在 4.3~5V ∈ [3.9,5.2]V ✓
  },
  {
    id: 'c2-2',
    track: 'main',
    chapter: 2,
    index: 2,
    title: '二极管：电流的单行道',
    subtitle: '正向导通，反向关断',
    briefing:
      '二极管只许电流单向通过。台上有一只 1N4148 二极管（正向压降约 0.7V）和 5V 电源。选一电阻与它串联，让正向电流落在 8~12mA——方向接反了可一点电流都没有。',
    intro: [
      { speaker: 'laozhou', text: '二极管是电路的单向阀。电流顺着一个方向走，交 0.7V 的「过路费」；想倒着走？门都没有。' },
      { speaker: 'xiaohan', text: '有银环的那头是阴极（k）！电流从 a 进 k 出！接反了整个回路就哑火了！' },
      { speaker: 'laozhou', text: '这点「过路费」叫正向压降 Vf。硅管约 0.7V，肖特基管只要 0.3V，LED 其实也是二极管，Vf 更高而已。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '电流顺利通过单行道！9mA 多一点，完美！' },
      { speaker: 'laozhou', text: '冷知识：把二极管反过来用也有价值——稳压二极管（齐纳管）就是利用反向击穿来稳住电压的。元件的「缺点」用对了地方就是特性。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 470 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'D1', type: 'diode', x: 352, y: 176, params: { vf: 0.7 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'D1', port: 'a' } },
      { kind: 'connected', a: { comp: 'D1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 380, max: 500 },
      { kind: 'branch-current', comp: 'D1', min: 8, max: 12 },
    ],
    stars: [
      { id: 'first-try', label: '方向一次接对', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '二极管导通后自己吃掉 0.7V，剩下的电压全在电阻上。目标电流约 10mA。',
      '电阻压降 = 5 − 0.7 = 4.3V，R = 4.3V ÷ 10mA ≈ 430Ω，附近的标准值 470Ω 就很合适。',
      'RP1 设为 470Ω（得 9.1mA），连线：BT1.pos→RP1→D1.a→D1.k→BT1.neg。注意 D1 别接反。',
    ],
    knowledge: {
      title: '二极管：PN 结的单向阀门',
      body: '二极管由一块 P 型半导体和一块 N 型半导体拼接而成，交界的 PN 结只允许电流从阳极（a）流向阴极（k）。正向导通需要克服「门槛电压」：硅管约 0.7V，肖特基管 0.2~0.4V，锗管约 0.3V。导通之后电流随电压指数上升，所以实际电路里总要串电阻限流。反向加电压时只有微安级漏电流，直到超过反向耐压才会击穿——普通二极管击穿即损坏，而齐纳二极管偏偏工作在击穿区，用来稳压。选型三看：正向电流定额、反向耐压、恢复速度（开关电源里慢恢复二极管会严重发热）。',
    },
    // 验算: R=470Ω 时 I=(5−0.7)/470=9.15mA ∈ [8,12]mA ✓；R∈[380,500] → I∈[8.6,11.3]mA ⊂ [8,12] ✓
  },
  {
    id: 'c2-3',
    track: 'main',
    chapter: 2,
    index: 3,
    title: '三极管：用小电流撬动大电流',
    subtitle: 'NPN 的放大直觉',
    briefing:
      '三极管是电子世界的杠杆：基极（b）流入一点点电流，集电极（c）就能通过 β 倍的大电流。用 5V 电源、NPN 三极管驱动一颗 LED：基极经一颗电阻接电源，集电极串 LED 和 330Ω 电阻。让 LED 电流落在 6~12mA。',
    intro: [
      { speaker: 'laozhou', text: '看见那个三条腿的小黑块没有？NPN 三极管。基极是它的「方向盘」——手轻轻一动（几十微安），集电极的大电流（几毫安）就跟着转。' },
      { speaker: 'xiaohan', text: 'β=100 倍！基极给 0.1mA，集电极就能放 10mA！这不就是以小博大吗！' },
      { speaker: 'laozhou', text: '但记住两个电压：be 之间要交 0.7V 过路费，ce 饱和后还剩 0.2V。算电流的时候一个都不能忘。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: 'LED 亮了！而且是被一股看不见的小电流「遥控」点亮的！' },
      { speaker: 'laozhou', text: '冷知识：你手机里的芯片有上百亿个这样的三极管，每个比病毒还小。1956 年发明它的三位科学家拿了诺贝尔奖——电子时代就是从这个小黑块开始的。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 43000 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'Q1', type: 'npn', x: 320, y: 192, params: { beta: 100 }, locked: true },
        { id: 'R2', type: 'resistor', x: 480, y: 96, params: { resistance: 330 }, locked: true },
        { id: 'LED1', type: 'led', x: 480, y: 224, params: { vf: 2 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'Q1', port: 'b' } },
      { kind: 'connected', a: { comp: 'R2', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'R2', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'Q1', port: 'c' } },
      { kind: 'connected', a: { comp: 'Q1', port: 'e' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 20000, max: 50000 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 6, max: 12 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次点亮', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      'LED 支路：5V → R2(330Ω) → LED(2V) → Q1 集电极 → 发射极回负极。先算这条支路的电流。',
      'Ic ≈ (5 − 2 − 0.2) ÷ 330 ≈ 8.5mA。要放出这么多电流，基极至少需要 Ic÷β = 0.085mA。',
      'Ib = (5 − 0.7) ÷ Rb ≥ 0.085mA → Rb ≤ 50kΩ。RP1 用 43kΩ 正好，按提示把 6 条线连齐。',
    ],
    knowledge: {
      title: '三极管的三种状态',
      body: 'NPN 三极管有三种工作状态：截止（基极无电流，ce 断开）、放大（Ic = β × Ib，像个比例阀门）、饱和（Ib 足够大，ce 间只剩 0.2V 饱和压降，相当于开关闭合）。做开关用时，要让三极管明确落在截止或饱和区——本关就是饱和开关：基极电阻 Rb 按 Ib ≥ Ic ÷ β 再留 3~5 倍裕量来选，43kΩ 给出 0.1mA 基流，足够放出 8.5mA。判饱和口诀：「基流给足，ce 见底」。另外别忘了两个固定压降：Vbe ≈ 0.7V（算基流时用），Vce(sat) ≈ 0.2V（算负载电流时用）。模电老师常考的问题「β 到底是多少」——数据手册给的 100~300 是范围，设计永远按最小 β 算。',
    },
    // 验算: Ib=(5−0.7)/43k=0.1mA；LED支路饱和电流 Ic=(5−2−0.2)/330=8.5mA ∈ [6,12]mA ✓；
    // 需 Ib≥8.5/100=0.085mA → Rb≤50.6kΩ，[20k,50k] 全区间饱和 ✓（50k 时 Ib=0.086mA 临界仍饱和 ✓）
  },
  {
    id: 'c2-4',
    track: 'main',
    chapter: 2,
    index: 4,
    title: '电感：讨厌变化的倔强家伙',
    subtitle: '电流的惯性',
    briefing:
      '电感与电容正好相反：它不怕电压突变，就怕电流突变。把 1H 电感串进 LED 回路（5V 电源、220Ω 电阻、LED），观察通电瞬间电流不是「跳」上去而是「爬」上去的。稳态电流落在 10~18mA 即过关。',
    intro: [
      { speaker: 'laozhou', text: '电感是个犟脾气：你想让电流突然变化，它偏不让——它会产生一个反向电压来对抗变化。这叫「楞次定律」。' },
      { speaker: 'xiaohan', text: '所以上电瞬间电流是慢慢爬升的！但等它「认命」之后，电感就跟一根导线没啥两样！' },
      { speaker: 'laozhou', text: 'τ = L / R，和 RC 的公式对称得很。电容稳电压，电感稳电流——这俩是电路里的太极两仪。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: 'LED 慢半拍才亮！电感的「拖延症」实锤了！' },
      { speaker: 'laozhou', text: '冷知识：电感断电瞬间会「发飙」——储存的能量无处释放，能打出几千伏的火花。继电器线圈两端并联的二极管，就是为这股邪火准备的泄洪道。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'L1', type: 'inductor', x: 240, y: 96, params: { inductance: 1 }, locked: true },
        { id: 'R1', type: 'resistor', x: 384, y: 96, params: { resistance: 220 }, locked: true },
        { id: 'LED1', type: 'led', x: 320, y: 272, params: { vf: 2 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'L1', port: 'a' } },
      { kind: 'connected', a: { comp: 'L1', port: 'b' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次完成', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '电感稳态时相当于导线，所以最终电流由电阻和 LED 决定：把四个元件串成一圈即可。',
      '顺序无所谓（串联电流处处相等）：BT1→L1→R1→LED1(a进k出)→回 BT1 负极。',
      '连线四条：BT1.pos→L1.a，L1.b→R1.a，R1.b→LED1.a，LED1.k→BT1.neg。稳态 I=(5−2)/220≈13.6mA。',
    ],
    knowledge: {
      title: '电感：磁场里的惯性',
      body: '电感把电能存进磁场，核心特性是「电流不能突变」：外加电压突变时，电感会感应出反向电动势拖着电流慢慢变化，时间常数 τ = L / R。本关 τ = 1H ÷ 220Ω ≈ 4.5ms，所以 LED 会晚几十毫秒才完全点亮。稳态之后电感只剩导线电阻，电流由欧姆定律决定：(5−2)÷220 = 13.6mA。电感最广为人知的「坏脾气」是断电反峰——电流被强行切断时感应电压可飙升至电源电压的几十倍，足以击穿开关管，所以驱动继电器、电机时必须加续流二极管。而这份「倔强」也是宝藏：开关电源、EMI 滤波、无线充电、LC 谐振，全靠电感稳住电流的这份执着。',
    },
    sim: { duration: 100, probes: [{ comp: 'LED1', port: 'a' }] },
    // 验算: 稳态 I=(5−2)/220=13.6mA ∈ [10,18]mA ✓；τ=L/R=1/220≈4.5ms，仿真 100ms≈22τ 早已稳态 ✓
  },
];
