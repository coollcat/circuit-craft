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
      '认识电容的第一步：看它「喝水」。电容是一只存电的小水桶，5V 电源、10kΩ 电阻、100µF 电容都在台上，把它们一个接一个串成一圈（这叫串联），运行后观察电容两端的电压慢慢爬升——充到 3.9V 以上即达标。',
    intro: [
      { speaker: 'laozhou', text: '电容是电路里的小水桶：电流往里灌，水位（电压）慢慢涨。灌多快由谁决定？电阻 R 和容量 C 的乘积——我们叫它时间常数 τ（读作「涛」，就是「灌个差不多要多久」）。' },
      { speaker: 'xiaohan', text: '10kΩ × 100µF = 1 秒！就像用细水管（大电阻）给小桶灌水，等个一两秒，水位就涨上来啦！' },
      { speaker: 'laozhou', text: '充电不是匀速的：一开始涨得快，越接近充满越慢——像往快满的杯子里倒水，手会不自觉放慢。一个 τ 充到 63%，五个 τ 才算基本充满。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '看到没！电压不是跳上去的，是爬上去的！这就是电容的脾气！' },
      { speaker: 'laozhou', text: '冷知识：相机闪光灯靠电容一瞬间把水全倒出来，主板上芯片旁边的电容靠它稳住电压不晃动。同一个「小水桶」，既能当水塔也能当防震垫。' },
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
      '电容充电需要一条完整回路：电源 → 电阻 → 电容 → 地（电流的「家」）。电阻越大，充电越慢。',
      '把 R1 串在 BT1 正极和 C1 之间，C1 另一端接地，电池负极也接地。',
      '连线：BT1.pos→R1.a，R1.b→C1.a，C1.b→GND1，BT1.neg→GND1。充电要一两秒，耐心等它爬到 3.9V——真实电路里也是这个速度。',
    ],
    knowledge: {
      title: 'RC 充电与时间常数 τ',
      body: '电容是一只存电的小水桶，充电速度有个超好记的公式：τ（时间常数）= R × C。本关 τ = 10kΩ × 100µF = 1 秒。意思是：1 秒后电压充到目标的 63%（大约三分之二），2 秒到 86%，5 秒后就基本满了。所以 R 越大（水管越细）、C 越大（水桶越深），充满就越慢——两个乘起来就是「要等多久」。这个「慢慢爬」的节奏大有用处：定时器靠它数数，上电复位靠它等一等再开机，按键消抖靠它滤掉毛刺。记住 63% 和「5 个 τ 充满」这两个数，以后看到 RC 电路心里就有谱了。',
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
      '二极管只许电流单方向通过（电流的「单行道」）。台上有一只 1N4148 二极管（过路费约 0.7V）和 5V 电源。选一颗电阻与它排成一队串联，让电流落在 8~12mA——方向接反了可一点电流都没有。',
    intro: [
      { speaker: 'laozhou', text: '二极管是电路的单向闸门，就像地铁站的进站闸机：顺着推就开，倒着推纹丝不动。电流顺行得交 0.7V 的「过路费」；想倒着走？门都没有。' },
      { speaker: 'xiaohan', text: '有银环的那头是阴极（k，出口）！电流从阳极（a，入口）进、阴极出！接反了整个回路就哑火了！' },
      { speaker: 'laozhou', text: '这点「过路费」学名叫正向压降 Vf。普通硅管约 0.7V，肖特基管只要 0.3V，上一章的 LED 其实也是二极管，只是过路费更贵（2V 起）。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '电流顺利通过单行道！9mA 多一点，完美！' },
      { speaker: 'laozhou', text: '冷知识：把二极管反过来用也有价值——稳压二极管就是利用「反着接」来稳住电压的。元件的「缺点」用对了地方就是本事。' },
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
      body: '二极管内部是两种半导体拼成的一道「单向闸机」，只许电流从阳极（a）流向阴极（k）。顺着走要交「过路费」（正向压降 Vf）：普通硅管约 0.7V，肖特基管只要 0.2~0.4V。交完过路费它就彻底放开——电流多大会不管，所以必须串颗电阻帮它限流，不然会烧。反着接它坚决不放行，这就是它最大的用处：防接反、给线圈泄火（续流）、把交流电「梳」成直流（整流）。记一句口诀：「有环那头是出口，顺行要交过路费」。选二极管看三样：能吃多大电流、能扛多高反向电压、反应够不够快。',
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
      '三极管是电子世界的「省力杠杆」：控制脚（基极 b）流入一点点电流，主通道（集电极 c → 发射极 e）就能通过 β 倍的大电流（β 读作「贝塔」，是放大倍数）。用 5V 电源、NPN 三极管驱动一颗 LED：基极经一颗电阻接电源，集电极串 LED 和 330Ω 电阻。让 LED 电流落在 6~12mA。',
    intro: [
      { speaker: 'laozhou', text: '看见那个三条腿的小黑块没有？NPN 三极管。三条腿分工：基极 b 是「方向盘」，集电极 c 和发射极 e 是主通道。方向盘轻轻一动（几十微安的小电流），主通道的大电流（几毫安）就跟着放行。' },
      { speaker: 'xiaohan', text: 'β=100 倍！基极给 0.1mA，主通道就能放 10mA！就像用一根手指按开关，开动一台大机器！' },
      { speaker: 'laozhou', text: '但记住两个「过路费」：基极到发射极要交 0.7V，主通道全开时还会留下 0.2V。算电流的时候一个都不能忘。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: 'LED 亮了！而且是被一股看不见的小电流「遥控」点亮的！' },
      { speaker: 'laozhou', text: '冷知识：你手机里的芯片有上百亿个这样的三极管，每个比病毒还小。发明它的三位科学家拿了诺贝尔奖——电子时代就是从这个小黑块开始的。' },
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
      'LED 支路：5V → R2(330Ω) → LED(占 2V) → Q1 集电极 → 发射极回负极。先算这条主通道的电流。',
      '主通道电流 ≈ (5 − 2 − 0.2) ÷ 330 ≈ 8.5mA。要放出这么多，基极至少需要 8.5 ÷ 100 = 0.085mA。',
      '基极电流 = (5 − 0.7) ÷ Rb ≥ 0.085mA → Rb ≤ 50kΩ。RP1 用 43kΩ 正好，按提示把 6 条线连齐。',
    ],
    knowledge: {
      title: '三极管的三种状态',
      body: 'NPN 三极管像一扇由小电流遥控的闸门，有三种状态：全关（基极没电流，主通道断开）、半开（主通道电流 = β × 基极电流，像个比例阀门）、全开（基流给足了，主通道只剩 0.2V 压降，跟开关闭合差不多）。当开关用的口诀是「要么全关，要么全开，别停在半开」——本关就是全开：基极电流按「主通道电流 ÷ β」算出来再多给几倍，43kΩ 给出 0.1mA，放 8.5mA 绰绰有余。还有两笔固定「过路费」要记账：基极那笔 0.7V（算基极电流时减），主通道全开那笔 0.2V（算 LED 电流时减）。最后记住：每只管子的 β 都不完全一样（手册写 100~300），设计时按最小的算，才稳。',
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
      '电感（一圈铜线绕成的线圈）与电容正好相反：它不怕电压突变，就怕电流突变。把 1H 电感串进 LED 回路（5V 电源、220Ω 电阻、LED），观察通电瞬间电流不是「跳」上去而是「爬」上去的。最后稳定在 10~18mA 即过关。',
    intro: [
      { speaker: 'laozhou', text: '电感是个犟脾气，像一辆很重的推车：你想让它突然动起来或突然停下，它都跟你较劲——电流想突变，它就顶回去。' },
      { speaker: 'xiaohan', text: '所以通电那一瞬间，电流是慢慢爬起来的！但等它「认命」跑顺了，电感就跟一根普通导线没啥两样！' },
      { speaker: 'laozhou', text: '它的「磨蹭时间」τ = L / R，和电容的 τ = R × C 正好成对。电容稳住电压不突变，电感稳住电流不突变——这俩是电路里的一对欢喜冤家。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: 'LED 慢半拍才亮！电感的「拖延症」实锤了！' },
      { speaker: 'laozhou', text: '冷知识：电感断电瞬间会「发飙」——攒下的能量没地方去，能打出上千伏的火花。所以继电器线圈两端都要并一颗二极管，专门给这股邪火开一条泄洪道。' },
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
      '电感「认命」之后就跟导线一样，所以最终电流还是电阻和 LED 说了算：把四个元件串成一圈即可。',
      '顺序无所谓（串成一队时，队伍里电流处处相等）：BT1→L1→R1→LED1(a进k出)→回 BT1 负极。',
      '连线四条：BT1.pos→L1.a，L1.b→R1.a，R1.b→LED1.a，LED1.k→BT1.neg。稳定后 I=(5−2)/220≈13.6mA。',
    ],
    knowledge: {
      title: '电感：电流的惯性',
      body: '电感是一圈线圈，它把电能存进磁场，核心脾气是「电流不能突变」：你想让它突然变大变小，它就顶着一个反向电压跟你较劲，只能慢慢变。磨蹭多久？τ = L ÷ R，本关 τ = 1H ÷ 220Ω ≈ 4.5 毫秒，所以 LED 会晚几十毫秒才完全亮透。等它「认命」（稳态）之后，电感就跟导线一样，电流回到欧姆定律：(5−2)÷220 = 13.6mA。它最出名的「坏脾气」是断电瞬间发飙：电流被硬切断时，感应电压能冲到电源的几十倍，所以驱动继电器、电机必须加一颗续流二极管给它泄火。这份「倔强」反过来也是宝：开关电源、滤波、无线充电，全靠它稳住电流的执着。',
    },
    sim: { duration: 100, probes: [{ comp: 'LED1', port: 'a' }] },
    // 验算: 稳态 I=(5−2)/220=13.6mA ∈ [10,18]mA ✓；τ=L/R=1/220≈4.5ms，仿真 100ms≈22τ 早已稳态 ✓
  },
];
