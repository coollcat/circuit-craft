// 第 6 章 · 无线通信（4 关）—— 调制、天线匹配、RF 布局、无线节点（林工戏份加重）
// 单位约定：电压 V，电流 mA，频率 Hz。LED Vf=2V。
import type { LevelDef } from '@/engine/types';

export const C6_LEVELS: LevelDef[] = [
  {
    id: 'c6-1',
    track: 'main',
    chapter: 6,
    index: 1,
    title: '调制：让信号搭便车',
    subtitle: '为什么天线要做那么长',
    briefing:
      '林工的客户想把温度数据「扔」到 100 米外。低频信号自己飞不远——它需要一个高频「载波」驮着它跑。把信号发生器调到 433MHz 载波频段，接入射频发射模块，再送到天线。链路接通、载波频率落在 400~450MHz 即过关。',
    intro: [
      { speaker: 'lingong', text: '客户原话：「传感器在田这头，屏幕在田那头，不许拉线。」——这就是无线通信的全部动机。接下来四关，我盯着你把这事儿办漂亮。' },
      { speaker: 'laozhou', text: '为什么不用 1kHz 直接发射？天线长度和波长成正比，1kHz 的波长 300 公里，你打算立一根 75 公里的天线吗？433MHz 的波长只有 69cm，天线 17cm 就够。' },
      { speaker: 'xiaohan', text: '调制 = 让低频信号骑上高频载波！AM 调幅度，FM 调频率，就像把信绑在鸽子上！' },
    ],
    outro: [
      { speaker: 'lingong', text: '载波链路通了。记住这个频段 433MHz——它是免许可的 ISM 频段，全世界遥控器、门铃、胎压监测都在用。' },
      { speaker: 'laozhou', text: '冷知识：你家的 WiFi 在 2.4GHz，波长 12.5cm——所以路由器天线只有一指长。频率越高天线越短，但穿墙越差，这是物理给的公平。' },
    ],
    palette: [
      { id: 'FG1', type: 'funcgen', x: 0, y: 0, params: { waveform: 'sine', freq: 1000, vmin: 0, vmax: 1 } },
      { id: 'ANT1', type: 'antenna', x: 0, y: 0, params: { impedance: 50 } },
    ],
    preset: {
      components: [
        { id: 'MOD1', type: 'module', x: 320, y: 176, params: { band: '433M' }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'funcgen', count: 1 },
      { kind: 'component-placed', type: 'antenna', count: 1 },
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'MOD1', port: 'in' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'out' }, b: { comp: 'ANT1', port: 'a' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'FG1', param: 'freq', min: 400e6, max: 450e6 },
    ],
    stars: [
      { id: 'first-try', label: '载波一次调对', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '链路方向：信号源 → 发射模块 → 天线。先把三个环节连起来，再调频率。',
      'FG1 的 freq 参数默认 1kHz，远远不够——把它改到 433MHz（433000000）附近。',
      '连线：FG1.out→MOD1.in，MOD1.out→ANT1.a，两边 gnd 都接 GND1。freq 用滑杆（对数刻度）拉到 433MHz 附近，或直接在数字框输入 433000000。',
    ],
    knowledge: {
      title: '载波与调制：无线的底层逻辑',
      body: '天线要高效辐射，尺寸需与波长可比（常见四分之一波长）。音频信号几 kHz，波长数百公里，直接辐射是天方夜谭——于是工程师发明了调制：让信息搭在高频载波上。AM（调幅）用信息控制载波幅度，FM（调频）控制频率，数字时代的 ASK/FSK/QAM 是它们的数字化身。载波频率的选择是三重妥协：越高，天线越短、带宽越大；但穿透损耗越重、器件越贵。433MHz/868MHz/2.4GHz 这些 ISM 免许可频段，正是这个妥协空间的甜点。接收端做相反的事——解调，把信息从载波上卸下来。一来一回，就是全部无线通信的骨架。',
    },
    // 验算: λ=c/f=3e8/433e6≈0.69m，λ/4≈17cm 天线可行 ✓；freq 目标 433e6 ∈ [400e6,450e6] ✓（默认 1kHz 必须改，教学点成立）
  },
  {
    id: 'c6-2',
    track: 'main',
    chapter: 6,
    index: 2,
    title: '天线与匹配：把能量送上天',
    subtitle: '50Ω：射频世界的通用语言',
    briefing:
      '发射模块的输出阻抗是 50Ω，天线的阻抗也要调到 50Ω——阻抗不匹配，能量会像撞墙一样反射回来。把天线阻抗参数调到 45~55Ω 并接通「模块 → 天线」链路。',
    intro: [
      { speaker: 'lingong', text: '上一关样机发出去的距离只有 8 米，客户差点翻脸。查下来：天线阻抗乱配，能量大半反射回了模块。这关就是来堵这个漏洞的。' },
      { speaker: 'laozhou', text: '阻抗匹配的道理和水管一样：粗细一致的管子水才流得顺。射频世界里，「粗细一致」就是人人都用 50Ω。' },
      { speaker: 'xiaohan', text: '不匹配会怎样？驻波、发热、距离腰斩！匹配好了，能量 100% 出门！' },
    ],
    outro: [
      { speaker: 'lingong', text: '反射降到忽略不计，距离达标。这一课值一块板子的钱。' },
      { speaker: 'laozhou', text: '冷知识：为什么是 50Ω 不是整数 100？1930 年代同轴电缆实验发现：空气介质同轴线在 30Ω 时功率容量最大、77Ω 时损耗最低——50Ω 是两者的折中，一用就是九十年。' },
    ],
    palette: [
      { id: 'ANT1', type: 'antenna', x: 0, y: 0, params: { impedance: 75 } },
    ],
    preset: {
      components: [
        { id: 'MOD1', type: 'module', x: 224, y: 176, params: { band: '433M' }, locked: true },
        { id: 'GND1', type: 'gnd', x: 224, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'antenna', count: 1 },
      { kind: 'connected', a: { comp: 'MOD1', port: 'out' }, b: { comp: 'ANT1', port: 'a' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'ANT1', param: 'impedance', min: 45, max: 55 },
    ],
    stars: [
      { id: 'first-try', label: '一次匹配成功', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '模块端口默认 50Ω，把天线的 impedance 参数改成同一个数。',
      'ANT1 默认 75Ω（电视天线规格），不匹配。改成 50Ω。',
      'ANT1.impedance = 50，连线 MOD1.out→ANT1.a，MOD1.gnd→GND1。',
    ],
    knowledge: {
      title: '阻抗匹配与反射',
      body: '射频信号在传输线上行走，遇到阻抗突变就会部分反射——就像光从空气射入玻璃。反射系数 Γ = (ZL − Z0)/(ZL + Z0)：负载 75Ω 接 50Ω 系统，Γ = 0.2，4% 的功率原路返回；严重失配时反射功率轻则让效率腰斩，重则烧坏功放。衡量匹配的工程指标是驻波比 VSWR，1.0 为完美，2.0 以内通常可用。50Ω 成为射频世界的通用标准后，模块、电缆、天线、仪器全部对齐这个数——「全链路 50Ω」是射频工程师的第一直觉。失配时的补救手段是匹配网络：用 LC 元件把负载阻抗「变换」到 50Ω，史密斯圆图就是干这活的老牌利器。',
    },
    // 验算: Z0=50Ω，目标 ZL∈[45,55] → |Γ|≤|5/105|≈0.048，VSWR≤1.1，功率反射≤0.23%，匹配合格 ✓
  },
  {
    id: 'c6-3',
    track: 'main',
    chapter: 6,
    index: 3,
    title: 'RF 布局的禁区',
    subtitle: '丝印写着：RF 区域 · 禁止走线',
    briefing:
      '给一块 ESP32 射频模块供电并接好天线：模块 vcc 接 3.3V，天线接射频输出脚，100nF 去耦电容并就绪。电气目标之外，记住铁律——天线下方和周围区域禁止铺铜走线（「天线净空区」），这条写进你的工程直觉里。',
    intro: [
      { speaker: 'lingong', text: '这批板子要上 ESP32。我先把丑话放前面：射频部分的布局，一条线都不许任性。天线下面的铜，一平方毫米都不能有。' },
      { speaker: 'laozhou', text: '天线靠电磁场工作，附近的铜皮会把场「闷」住，辐射效率雪崩。模块厂的手册里都印着 keepout 区域图——照做，别发明。' },
      { speaker: 'xiaohan', text: '供电也要干净！100nF 去耦贴上去，射频模块对电源噪声超级敏感！' },
    ],
    outro: [
      { speaker: 'lingong', text: '供电、去耦、天线链路都对了。布局净空区我默认你刻进脑子里了——毕业设计我会查。' },
      { speaker: 'laozhou', text: '冷知识：ESP32 模块为什么大多把天线做成 PCB 板载「蛇形线」并伸出板边？就是为了让天线悬在主板铜皮之外。便宜、免调试、还通过了认证——工程的智慧常是「躲开」而非「硬刚」。' },
    ],
    palette: [
      { id: 'CP1', type: 'capacitor', x: 0, y: 0, params: { capacitance: 100e-9 } },
      { id: 'ANT1', type: 'antenna', x: 0, y: 0, params: { impedance: 50 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'MOD1', type: 'module', x: 320, y: 160, params: { band: '2.4G' }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'capacitor', count: 1 },
      { kind: 'component-placed', type: 'antenna', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'MOD1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'a' }, b: { comp: 'MOD1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'out' }, b: { comp: 'ANT1', port: 'a' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'CP1', param: 'capacitance', min: 80e-9, max: 120e-9 },
      { kind: 'param', comp: 'ANT1', param: 'impedance', min: 45, max: 55 },
    ],
    stars: [
      { id: 'first-try', label: '链路一次接通', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '三条线想清楚：供电（3.3V→vcc）、去耦（电容并在 vcc 与地）、射频输出（out→天线）。',
      '所有 gnd 汇入 GND1；天线阻抗沿用上一关的 50Ω；电容容值 100nF。',
      '连线 7 条见 briefing 顺序：BT1→vcc，CP1 跨 vcc/gnd，MOD1.out→ANT1，各自接地。',
    ],
    knowledge: {
      title: '天线净空区与射频供电',
      body: '射频布局三铁律：其一，天线净空区（keepout）——天线辐射体下方及周边禁止任何铜皮、走线、甚至螺丝，地平面必须沿模块手册给出的边界整齐收刀；净空被侵占，驻波比恶化、通信距离直接打折。其二，射频供电要「净」：WiFi 发射瞬间电流脉冲可达数百 mA，100nF 高频去耦 + 10µF 储能就近伺候，电源走线短而粗。其三，射频走线本身按 50Ω 阻抗控制（线宽由板材和层叠决定），转弯用圆弧或 45°，绝不直角。这套规矩看似繁琐，实则是模块厂商把射频难题「打包」后留给你仅有的几条红线——守住红线，无线就是搭积木；越过红线，射频会让你见识什么叫玄学。',
    },
    // 验算: 3.3V 供电 MOD1；去耦 100nF ∈ [80n,120n] ✓；ANT 50Ω ∈ [45,55] ✓（同 c6-2 匹配论证）
  },
  {
    id: 'c6-4',
    track: 'main',
    chapter: 6,
    index: 4,
    title: '无线传感器节点：林工的正式订单',
    subtitle: '功耗预算是第一约束',
    briefing:
      '正式订单来了：电池供电的无线温湿度节点——5V 电池，MCU（静态 30mA）采集传感器，状态 LED 指示。客户要求整机电流 38~52mA（电池才能撑过一个季度）。接好传感器 → MCU → LED 全链路；验收看两条账：LED 支路 8~22mA、MCU 静态 28~32mA（合计 30+13.6=43.6mA，在预算内）。',
    intro: [
      { speaker: 'lingong', text: '合同条款我念重点：一节电池，续航一个季度。换算下来整机电流预算 50mA 封顶。超了，退货。这单做好了，毕业设计的单子也是你的。' },
      { speaker: 'laozhou', text: '功耗设计的入手处永远是列账本：MCU 吃多少，外设吃多少，指示灯吃多少，加起来对一对。' },
      { speaker: 'xiaohan', text: 'MCU 30mA + LED 十几 mA……电阻选 220Ω 是 13.6mA，总共 43.6mA，在预算内！' },
    ],
    outro: [
      { speaker: 'lingong', text: '43.6mA，预算内还有 12% 裕量——专业。第 7 章，我们谈谈选型、成本和量产。' },
      { speaker: 'laozhou', text: '冷知识：真实的物联网节点靠「睡眠」把平均功耗压到微安级——99% 时间睡觉，醒来 50ms 采样发射。ESP32 深度睡眠只要 10µA。省电的最高境界，是尽量不存在。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 192, params: { voltage: 5 }, locked: true },
        { id: 'U1', type: 'mcu', x: 320, y: 160, params: { pinVoltage: 5, current: 30 }, locked: true },
        { id: 'SEN1', type: 'sensor', x: 64, y: 320, params: { output: 1.2 }, locked: true },
        { id: 'LED1', type: 'led', x: 544, y: 176, params: { vf: 2 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 320, y: 352, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'U1', port: 'p1' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'p0' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'led-lit', comp: 'LED1' },
      // 功耗预算拆两条账验收（引擎中 GPIO 为独立电压源，LED 电流不经过 BT1 节点）：
      // LED 支路 13.6mA ∈ [8,22] + MCU 静态 30mA ∈ [28,32]，合计 43.6mA 仍在 38~52mA 预算叙事内
      { kind: 'branch-current', comp: 'LED1', min: 8, max: 22 },
      { kind: 'branch-current', comp: 'U1', min: 28, max: 32 },
    ],
    stars: [
      { id: 'first-try', label: '一次满足预算', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '7 分钟内完成', check: 'time', value: 420 },
    ],
    hints: [
      '总电流 = MCU 静态电流 + LED 支路电流。MCU 是固定的 30mA，你能调的只有 LED 支路。',
      '预算 38~52mA → LED 支路允许 8~22mA → 电阻范围 (5−2)÷I 算一下，220Ω 正好。',
      'RP1 用 220Ω：LED 支路 13.6mA（目标 8~22mA），MCU 静态 30mA（目标 28~32mA），合计 43.6mA 在预算内。按 briefing 把 9 条线连齐，并双击 U1，勾选 P0 输出高。',
    ],
    knowledge: {
      title: '功耗预算：电池产品的生死簿',
      body: '电池产品的设计从一张功耗账开始：各模块电流 × 工作占空比，加权平均后对照电池容量（mAh）推算续航。本关是持续供电的最简情形：30mA（MCU）+ 13.6mA（LED）= 43.6mA，2000mAh 电池理论续航约 46 小时——这就是为什么真实节点必须睡眠。以 ESP32 为例：工作 240mA、浅睡 0.8mA、深睡 10µA，若每小时醒来 3 秒采样发送，平均电流可压到 1mA 以下，续航从 8 小时变成 3 个月。功耗工程的三板斧：降频（功耗∝频率×电压²）、睡眠（掐断时钟与电源域）、外设断电（负载开关）。每省 1mA，电池小一圈，成本降一块——功耗就是钱。',
    },
    // 验算: LED 支路 I=(5−2)/220=13.6mA ∈ [8,22] ✓；MCU 静态 30mA ∈ [28,32] ✓；
    // 合计 30+13.6=43.6mA ∈ [38,52]mA 预算叙事保留在 intro/outro/知识卡 ✓（裕量 ±12%）
  },
];
