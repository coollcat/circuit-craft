// 第 7 章 · 选型实战（4 关）—— 数据手册、LDO、成本供货、BOM → 解锁毕业设计
// 单位约定：电压 V，电流 mA。LED Vf=2V。LDO 压差按 0.2V 裕量评估。
import type { LevelDef } from '@/engine/types';

export const C7_LEVELS: LevelDef[] = [
  {
    id: 'c7-1',
    track: 'main',
    chapter: 7,
    index: 1,
    title: '数据手册之夜',
    subtitle: 'PDF 里藏着所有答案',
    briefing:
      '客户来料：3.3V 供电的指示灯。LED 数据手册写着 Vf=2.0V（典型）、If=20mA（最大）。老周建议按额定的 40~60% 使用——选一颗限流电阻，让电流落在 7~12mA，并把阻值锁定在 120~180Ω 的标准档。',
    intro: [
      { speaker: 'lingong', text: '量产项目和玩具的区别只有一个词：数据手册。玩具看「差不多」，量产看「第几页第几行」。这颗 LED 的手册我发你了，Vf、If、温度曲线都在里面。' },
      { speaker: 'laozhou', text: '读手册的顺序：先翻 Absolute Maximum Ratings（保命线），再看 Recommended Operating Conditions（好好干活区），最后才看特性曲线。别一上来就抄典型应用图。' },
      { speaker: 'xiaohan', text: '(3.3−2)÷0.0087 ≈ 150Ω！E24 标准系列里就有它！' },
    ],
    outro: [
      { speaker: 'lingong', text: '阻值、电流都在窗口内，还留了温度裕量。这才叫「按手册设计」。' },
      { speaker: 'laozhou', text: '冷知识：手册里的 Typical 值是 25°C 实验室产物，Min/Max 才是签合同的承诺。设计永远按最坏情况（Worst Case）算——按典型值设计的工程师，都在量产线上哭过。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 1000 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'LED1', type: 'led', x: 384, y: 176, params: { vf: 2 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 120, max: 180 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 7, max: 12 },
    ],
    stars: [
      { id: 'first-try', label: '一次选对阻值', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '目标电流取额定 20mA 的一半以下，比如 8~9mA。R = (3.3 − 2) ÷ I。',
      'R = 1.3V ÷ 8.7mA ≈ 150Ω，正好是 E24 标准值，顺手、便宜、好买。',
      'RP1 设 150Ω，得 I = 1.3/150 ≈ 8.7mA，串进回路点亮。',
    ],
    knowledge: {
      title: '怎么读一份数据手册',
      body: '数据手册（Datasheet）是元件的法律文书。阅读顺序：第一看 Absolute Maximum Ratings——超过必死的红线（电压、电流、温度），设计要永远远离；第二看 Recommended Operating Conditions——厂家承诺正常工作的区间；第三看 Electrical Characteristics 表格，注意每行参数附带的测试条件，Typical 是 25°C 平均值，Min/Max 才是量产承诺；第四看特性曲线，温度、频率对参数的影响全在图里。本关把 20mA 额定的 LED 压在 8.7mA 用，叫「降额设计」（Derating）：军工惯例按 50% 降额，消费电子至少留 20% 裕量。电阻功耗校核：P = I²R = 0.0087² × 150 ≈ 11mW，1/4W 绰绰有余。手册读三遍，改版少一半。',
    },
    // 验算: R=150Ω → I=(3.3−2)/150=8.67mA ∈ [7,12] ✓；R∈[120,180] → I∈[7.2,10.8]mA ⊂ [7,12] ✓
    // 电阻功耗 P=8.67mA²×150Ω≈11mW ≪ 250mW ✓
  },
  {
    id: 'c7-2',
    track: 'main',
    chapter: 7,
    index: 2,
    title: 'LDO 选型：冷静供电',
    subtitle: '压差、电流与发热的三国杀',
    briefing:
      '5V 输入要稳定输出 3.3V，负载是一颗 33Ω 电阻（约 100mA）。用一颗 LDO 稳压器完成任务：输出电压 3.2~3.4V、负载电流 90~110mA，并且 LDO 的额定电流要留足裕量（imax ≥ 110mA）。',
    intro: [
      { speaker: 'lingong', text: '这批节点的 MCU 要 3.3V 干净电源。DC-DC 效率高但噪声大，LDO 噪声低但发热——传感器模拟前端怕噪声，这单用 LDO。选型给我看计算过程。' },
      { speaker: 'laozhou', text: 'LDO 选型三问：压差够不够（输入至少高输出 0.2~0.3V）、电流定额够不够（留 20% 裕量）、热不热（P = (Vin−Vout)×I）。' },
      { speaker: 'xiaohan', text: '发热 P = (5−3.3) × 0.1 = 0.17W，SOT-223 封装扛得住！' },
    ],
    outro: [
      { speaker: 'lingong', text: '3.3V 输出纹丝不动，发热 0.17W 温升可控。选型报告我收下了。' },
      { speaker: 'laozhou', text: '冷知识：同样 5V 转 3.3V，LDO 效率只有 66%，剩下 34% 变成热。要是 12V 转 3.3V，效率 27%——那种场景请老老实实用 DC-DC，LDO 会烫到怀疑人生。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 33 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'U1', type: 'ic', x: 288, y: 176, params: { vout: 3.3, imax: 150 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'in' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'out' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'U1', param: 'imax', min: 110 },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 31, max: 36 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 3.2, max: 3.4 },
      { kind: 'branch-current', comp: 'RP1', min: 90, max: 110 },
    ],
    stars: [
      { id: 'first-try', label: '一次选对规格', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '负载电流由 3.3V 和你的电阻决定：I = 3.3 ÷ R。要 100mA 左右，R ≈ 33Ω。',
      '确认 LDO 的 imax（150mA）≥ 110mA——也就是负载上限再加裕量。压差 5−3.3=1.7V 远大于 0.3V，无忧。',
      'RP1 设 33Ω 接在 out 与地之间。I = 3.3/33 = 100mA，发热 (5−3.3)×0.1 = 0.17W。',
    ],
    knowledge: {
      title: 'LDO 选型四步棋',
      body: 'LDO（低压差线性稳压器）选型按四步走：第一步看压差 Dropout——输入必须高出输出至少这个值（传统 1117 要 1V，现代 LDO 只要 100~300mV），3.3V 输出配 5V 输入从容，配 3.6V 锂电就得精挑低压差型号；第二步看电流定额，按最大负载的 1.2~1.5 倍选；第三步算发热 P = (Vin − Vout) × Iload，本关 0.17W 对应 SOT-223 约 17°C 温升，安全——超过 0.5W 就要认真算热阻；第四步看 PSRR（电源抑制比）和噪声，模拟/射频前端的 LDO 这两行参数比效率重要。LDO vs DC-DC 的判据很朴素：压差小、电流小、怕噪声，用 LDO；压差大、电流大、怕发热，用 DC-DC。',
    },
    // 验算: I=3.3/33=100mA ∈ [90,110] ✓；R∈[31,36] → I∈[91.7,106.5] ⊂ [90,110] ✓
    // LDO 发热 P=(5−3.3)×0.1=0.17W，SOT-223(θJA≈100°C/W) 温升≈17°C ✓；imax=150 ≥ 110 ✓；压差 1.7V ≫ 0.3V ✓
  },
  {
    id: 'c7-3',
    track: 'main',
    chapter: 7,
    index: 3,
    title: '一分钱一分货：成本与供货',
    subtitle: '买得到的元件才是好元件',
    briefing:
      '同一盏 5V 指示灯，客户要求「成本最优、随时有货」。秘诀是选 E24 系列里最普通的 220Ω 电阻（210~230Ω 判定窗口）——比冷门阻值便宜还好买。点亮 LED，电流 10~18mA。',
    intro: [
      { speaker: 'lingong', text: '告诉你两个量产噩梦：一是选了个「完美但独家」的料，断供全线停产；二是阻值冷门，采购价是常规料三倍。设计要求不变，请用最大路的料实现。' },
      { speaker: 'laozhou', text: 'E24 系列是电阻的标准「尺码表」：1.0、1.1、1.2……2.2、2.4……每十倍频 24 档。设计时往尺码上靠，采购和库存都会感谢你。' },
      { speaker: 'xiaohan', text: '220Ω 是全宇宙最好买的电阻！没有之一！' },
    ],
    outro: [
      { speaker: 'lingong', text: '220Ω，一分钱一颗，哪个仓库都压着几万只。这才是量产审美。' },
      { speaker: 'laozhou', text: '冷知识：2021 年芯片荒时，一颗几毛钱的电源芯片炒到上百块，多少产品被迫改板换料。选型表里的「第二货源」（Second Source）不是可选项，是救命绳。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 470 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'LED1', type: 'led', x: 384, y: 176, params: { vf: 2 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 210, max: 230 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '一次选中标准料', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '电气上和第 1 章一样：3V 压降、十几 mA。但答案要落在「最大路」的阻值上。',
      'E24 里 3V÷13.6mA 对应的标准值是 220Ω。',
      'RP1 从默认 470Ω 改成 220Ω，接好回路，I ≈ 13.6mA。',
    ],
    knowledge: {
      title: 'E 系列标准值与可采购设计',
      body: '电阻电容的标称值不是连续的，而是按对数分档的 E 系列：E12（±10%）每十倍频 12 档，E24（±5%）24 档，E96（±1%）96 档。往标准值上靠的好处实实在在：价格低（常规料走量）、交期短（经销商常备）、替代多（几家品牌互认）。反之，一个 215Ω 的「精确」阻值可能全市场只有一家做——断供之日就是改板之时。可采购设计（Design for Supply）的清单：优先 E24 阻值、0805/0603 通用封装、多品牌互替的型号、避开生命周期末尾（EOL）的料；关键器件准备第二货源，并在原理图里标注兼容封装。工程师的浪漫是精确，供应链的浪漫是「随时买得到」。量产要的是后者。',
    },
    // 验算: R=220Ω → I=(5−2)/220=13.6mA ∈ [10,18] ✓；R∈[210,230] → I∈[13.0,14.3]mA ⊂ [10,18] ✓
  },
  {
    id: 'c7-4',
    track: 'main',
    chapter: 7,
    index: 4,
    title: 'BOM 出炉：通往毕业设计',
    subtitle: '章底大考：完整最小系统',
    briefing:
      '主线最后一关：搭一块完整的最小系统——5V 进，LDO 稳出 3.3V（3.2~3.4V 判定），MCU 上电，p0 通过 150Ω 电阻点亮状态 LED（6~12mA），传感器输出接入 p1。全部达成，毕业设计的大门就为你打开。',
    intro: [
      { speaker: 'lingong', text: '最后一关，也是入场券。把前六章的东西全部装进一块板：电源、稳压、主控、指示、采集。通过之后——我正式把 ESP32 最小系统板的项目交给你。' },
      { speaker: 'laozhou', text: 'BOM（物料清单）是电路的「配料表」：位号、型号、参数、封装、数量、单价。每一行都要经得起三问：参数对吗？买得到吗？多少钱？' },
      { speaker: 'xiaohan', text: '深呼吸！这就是终考！你学过的每一关都会在这里集合！' },
    ],
    outro: [
      { speaker: 'lingong', text: '3.3V 稳、灯亮、传感器进线正确——BOM 我签了。毕业设计见，别让我失望。' },
      { speaker: 'laozhou', text: '从你点亮第一颗 LED 到今天，整整七章。接下来没有关卡、没有提示——只有一块真板子和你自己的名字。去吧，毕业设计台在等你。' },
      { speaker: 'xiaohan', text: '（烙铁头亮起金光）主线通关！！回路工坊以你为荣！！' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 150 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'U1', type: 'ic', x: 240, y: 176, params: { vout: 3.3, imax: 150 }, locked: true },
        { id: 'U2', type: 'mcu', x: 448, y: 160, params: { pinVoltage: 3.3, current: 20 }, locked: true },
        { id: 'SEN1', type: 'sensor', x: 64, y: 320, params: { output: 1.65 }, locked: true },
        { id: 'LED1', type: 'led', x: 640, y: 176, params: { vf: 2 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 240, y: 352, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'in' } },
      { kind: 'connected', a: { comp: 'U1', port: 'out' }, b: { comp: 'U2', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U2', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'out' }, b: { comp: 'U2', port: 'p1' } },
      { kind: 'connected', a: { comp: 'SEN1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U2', port: 'p0' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'out' }, min: 3.2, max: 3.4 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 6, max: 12 },
    ],
    stars: [
      { id: 'first-try', label: '系统一次上电成功', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '8 分钟内完成', check: 'time', value: 480 },
    ],
    hints: [
      '按信号流分三段：电源段（BT1→LDO→MCU）、采集段（SEN1→p1）、指示段（p0→电阻→LED）。所有地汇到 GND1。',
      'LDO 输出 3.3V 给 MCU；MCU 的 p0 高电平也是 3.3V。LED 电流 = (3.3−2)÷R。',
      'RP1 = 150Ω：I = 1.3/150 ≈ 8.7mA。连齐 10 条线，并双击 U2，勾选 P0 输出高，上电即全绿。',
    ],
    knowledge: {
      title: 'BOM：从电路到产品的最后一跃',
      body: 'BOM（Bill of Materials）把原理图翻译成可执行的采购与生产指令。每一行包含：位号（R1、C3）、型号或参数（10kΩ 1% 0805）、封装、数量、供应商料号、单价。制作 BOM 的纪律：参数写全（电阻除阻值外还有精度、功率、封装）、关键件双货源、停产（EOL）料即时替换、价格波动大的料备注替代方案。成本核算顺手做：本关系统——LDO 约 ¥0.5、MCU 模组约 ¥12、无源件合计不到 ¥1，电源与连接器占大头——BOM 表一拉，产品毛利心中就有数。最后一步「贴装坐标 + BOM + Gerber」打包发板厂，你的设计就变成了流水线上的实物。恭喜，这是工程师的成人礼。',
    },
    // 验算: LDO vout=3.3V ∈ [3.2,3.4] ✓；LED 支路 I=(3.3−2)/150=8.67mA ∈ [6,12] ✓
    // MCU 静态 20mA + LED 8.7mA = 28.7mA < LDO imax 150mA ✓；LDO 发热 (5−3.3)×0.029≈0.05W ✓
  },
];
