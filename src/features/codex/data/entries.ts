// 图鉴条目数据：16 个元件，六段式（一句话 / 工作原理 / 关键参数 / 选型要点 / 常见坑 / 实物与封装）
export type LabKind = 'bands' | 'rc' | 'led' | 'opamp' | 'pullup';
export type CategoryId = 'passive' | 'semi' | 'ic' | 'mech';

export interface ParamRow {
  param: string;
  symbol: string;
  unit: string;
  guide: string;
}

export interface CodexEntry {
  id: string;
  name: string;
  en: string;
  refdes: string;
  category: CategoryId;
  /** 一句话人话解释 */
  tagline: string;
  /** 一句话本质（详情页头部） */
  essence: string;
  /** 首次遇见的主线章节（用于剧透锁定） */
  unlockChapter: number;
  lab?: LabKind;
  principle: string[];
  analogy: string;
  params: ParamRow[];
  selection: string[];
  pitfalls: string[];
  pkg: { packages: string[]; note: string };
  usedIn: { chapter: number; label: string }[];
  keywords: string[];
}

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'passive', label: '无源元件' },
  { id: 'semi', label: '半导体' },
  { id: 'ic', label: '集成电路' },
  { id: 'mech', label: '机电与射频' },
];

export const ENTRIES: CodexEntry[] = [
  {
    id: 'resistor',
    name: '电阻',
    en: 'Resistor',
    refdes: 'R',
    category: 'passive',
    tagline: '电流的刹车片。',
    essence: '电阻：阻碍电流，并把电能变成热。',
    unlockChapter: 1,
    lab: 'bands',
    principle: [
      '导体内部的晶格会散射自由电子，载流子每撞一次就损失一点能量，宏观上表现为「阻碍」。阻值由材料电阻率、长度和截面积决定：ρ·L/A。',
      '它服从欧姆定律 V=IR，两端压差与流过的电流成正比。被拦下的能量不会消失，而是变成热量：P=I²R。所以电阻既是「限流器」，也是全宇宙最诚实的电热丝。',
    ],
    analogy: '像水管里的一段细颈：颈越细，同样的水压下流量越小。',
    params: [
      { param: '标称阻值', symbol: 'R', unit: 'Ω / kΩ / MΩ', guide: '按 E24（±5%）或 E96（±1%）系列取档，算出来的值就近靠档' },
      { param: '额定功率', symbol: 'P', unit: 'W', guide: '0805 贴片只有 1/8W，0603 为 1/10W，直插 1/4W；按 2 倍余量选' },
      { param: '精度（公差）', symbol: 'Tol', unit: '%', guide: 'LED 限流 ±5% 足够；分压采样、基准电路建议 ±1%' },
      { param: '温度系数', symbol: 'TCR', unit: 'ppm/°C', guide: '普通厚膜 ±100~±200ppm；精密场合选 ±25ppm 以下' },
      { param: '额定电压', symbol: 'Vmax', unit: 'V', guide: '0805 约 150V；高压场合注意单颗电阻的耐压上限' },
    ],
    selection: [
      '先算功率余量：实际功耗不超过额定值的 50%。',
      '阻值优先靠 E24 档，非标阻值用两颗串并联凑。',
      '上拉/下拉 4.7kΩ~10kΩ 是万金油；LED 限流按 (Vcc−Vf)/If 算。',
    ],
    pitfalls: [
      '老周：0805 电阻标 1/8W 你就真当 1/8W 用？长期满功率焊盘都给你烤黄，打五折用。',
      '老周：拿 10MΩ 当运放反馈电阻，还嫌输出飘—— PCB 上的漏电和偏置电流专治高阻值。',
      '老周：色环从左读还是从右读？公差环（金/银/棕）孤零零在一边，从另一头读。',
    ],
    pkg: {
      packages: ['0402 / 0603 / 0805 贴片', '轴向直插（1/4W 最常见）', '色环：4 环 ±5%，5 环 ±1%'],
      note: '实物照片位：左侧放一颗 0805 贴片与直插 1/4W 电阻的对比照，标尺毫米格。贴片本体印 3 位或 4 位数字代码（472 = 4.7kΩ）。',
    },
    usedIn: [
      { chapter: 1, label: '点亮第一颗 LED 的限流计算' },
      { chapter: 3, label: '分压与偏置电路' },
    ],
    keywords: ['电阻', 'resistor', '限流', '色环', '欧姆', '上拉', '下拉'],
  },
  {
    id: 'capacitor',
    name: '电容',
    en: 'Capacitor',
    refdes: 'C',
    category: 'passive',
    tagline: '存电的小水桶，隔直通交。',
    essence: '电容：储存电荷，电压不能突变。',
    unlockChapter: 2,
    lab: 'rc',
    principle: [
      '两块面对面却不接触的导体板，中间夹着绝缘介质。充电时电荷堆积在极板上，形成电场储能 E=½CV²；放电时再吐出来。',
      '它的电流取决于电压变化率：I=C·dV/dt。电压想突变，就需要无穷大的电流——所以电容两端的电压总是「慢慢来」，这正是滤波、去耦、延时的物理基础。',
    ],
    analogy: '像水管系统中的蓄水池：水龙头猛开猛关，水池水位也只是缓缓起伏。',
    params: [
      { param: '标称容值', symbol: 'C', unit: 'pF / nF / µF', guide: '去耦 100nF 起步；电源输入 10µF；晶振负载 12~22pF' },
      { param: '额定电压', symbol: 'Vr', unit: 'V', guide: '工作电压打 5~7 折用：5V 电路选 10V 以上，别顶格' },
      { param: '介质类型', symbol: '—', unit: 'X7R / C0G / 电解', guide: '滤波选 X7R；定时/谐振选 C0G(NP0)；大容量才轮到电解' },
      { param: '等效串联电阻', symbol: 'ESR', unit: 'Ω', guide: 'LDO 对输出电容 ESR 有要求，固态钽/陶瓷 ESR 极低' },
      { param: '容差', symbol: 'Tol', unit: '%', guide: 'Y5V 随电压可掉 80% 容值，定时电路千万别用' },
    ],
    selection: [
      '每个芯片电源脚配 100nF X7R 陶瓷，贴脚放，越远越没用。',
      'MLCC 有直流偏压效应：10µF/16V 的 0805 用在 12V 上可能只剩一半容值。',
      '电解电容有极性，长脚正、壳体白条为负，接反会鼓包甚至爆。',
    ],
    pitfalls: [
      '老周：电解电容接反？先冒烟再开花，那个味儿你闻一次记一辈子。',
      '老周：拿 Y5V 当去耦，温度一上来容值掉一半，板子冬天抽风别找我。',
      '老周：100nF 离芯片 20mm 远？那叫装饰品，不叫去耦。',
    ],
    pkg: {
      packages: ['MLCC 贴片 0402~1210', '铝电解（直插/贴片，注意极性丝印）', '钽电容（小黄块，极性标记为正极！）'],
      note: '实物照片位：一排 MLCC、一颗直插铝电解（套管印负极白条）与一颗钽电容并排。提醒：钽电容色带标的是正极，与电解相反。',
    },
    usedIn: [
      { chapter: 2, label: '认识电容：隔直通交实验' },
      { chapter: 3, label: 'RC 充放电与滤波' },
    ],
    keywords: ['电容', 'capacitor', '去耦', '滤波', 'MLCC', '电解', 'ESR'],
  },
  {
    id: 'inductor',
    name: '电感',
    en: 'Inductor',
    refdes: 'L',
    category: 'passive',
    tagline: '电流的惯性，讨厌突变。',
    essence: '电感：阻碍电流变化，把电能暂时存进磁场。',
    unlockChapter: 2,
    principle: [
      '导线绕成线圈后，电流变化会激起反向感应电动势：V=L·dI/dt。电流想突变，电感就产生高电压顶回去——所以断电瞬间线圈两端会打火。',
      '它和电容是镜像的一对：电容稳电压，电感稳电流。LC 组合会谐振，f=1/(2π√LC)，这是选频、滤波与开关电源储能的核心。',
    ],
    analogy: '像水流里的大飞轮：流速想突然变大变小，飞轮都要跟你较劲。',
    params: [
      { param: '标称感量', symbol: 'L', unit: 'nH / µH / mH', guide: 'Buck 电源常用 2.2~10µH；射频匹配用 nH 级' },
      { param: '饱和电流', symbol: 'Isat', unit: 'A', guide: '超过它感量暴跌，按峰值电流的 1.3 倍选' },
      { param: '温升电流', symbol: 'Irms', unit: 'A', guide: '由直流电阻发热决定，持续工作看这个' },
      { param: '直流电阻', symbol: 'DCR', unit: 'Ω', guide: '越低越省电，功率电感从几十 mΩ 到几 Ω' },
      { param: '自谐振频率', symbol: 'SRF', unit: 'MHz', guide: '超过 SRF 它表现得像电容，射频应用必须查' },
    ],
    selection: [
      '开关电源功率电感优先看 Isat 与 Irms，两者取小的再打余量。',
      '数字电路附近选屏蔽（磁罩）电感，免得磁场到处串门。',
      '继电器/电机线圈两端必须并续流二极管，吸收断电反峰。',
    ],
    pitfalls: [
      '老周：继电器一断开单片机就复位？线圈的反向电动势没地方去，直接打进你的 MCU。续流二极管呢？',
      '老周：Isat 都不看就按感量买电感？电流一大它就是个电阻，电源效率哗啦往下掉。',
      '老周：非屏蔽电感贴着晶振放，时钟抖成筛子，别问我是怎么知道的。',
    ],
    pkg: {
      packages: ['工字型直插电感', '贴片功率电感（屏蔽/非屏蔽）', '磁珠（Ferrite Bead，位号也常用 L/FB）'],
      note: '实物照片位：一颗带磁罩的贴片功率电感与一颗工字电感对比。磁珠长得像黑色 MLCC，但功能是「高频电阻」。',
    },
    usedIn: [{ chapter: 2, label: '认识电感与磁珠' }],
    keywords: ['电感', 'inductor', '磁珠', '续流', '饱和电流', 'Buck'],
  },
  {
    id: 'crystal',
    name: '晶振',
    en: 'Crystal / XO',
    refdes: 'X / Y',
    category: 'passive',
    tagline: '电路的心跳起搏器。',
    essence: '晶振：用压电效应给出精确稳定的时钟频率。',
    unlockChapter: 6,
    principle: [
      '石英晶体有压电效应：加电压会形变，形变又产生电压。切成特定尺寸后，它在固有频率上机械谐振，等效为一个 Q 值极高的 LC 回路。',
      '配合芯片内部的皮尔斯振荡电路和两颗负载电容，就能持续振荡。无源晶振（Crystal）本身不起振，需要电路配合；有源晶振（Oscillator）上电直接输出方波。',
    ],
    analogy: '像音叉：敲一下就以固定音高振动，晶振是电路世界的音叉。',
    params: [
      { param: '标称频率', symbol: 'f', unit: 'MHz / kHz', guide: 'MCU 主频 8/12/16/40MHz；RTC 用 32.768kHz' },
      { param: '负载电容', symbol: 'CL', unit: 'pF', guide: '常见 12/18/20pF，外配两颗 ≈2×(CL−Cstray) 的电容' },
      { param: '频率精度', symbol: 'Tol', unit: 'ppm', guide: '常温 ±10~±20ppm 常见，通信场景看总预算' },
      { param: '等效串联电阻', symbol: 'ESR', unit: 'Ω', guide: '超过芯片驱动能力会不起振，低功耗 MCU 尤其要查' },
      { param: '工作温度', symbol: '—', unit: '°C', guide: '工业级 −40~+85°C，温漂曲线呈二次抛物线' },
    ],
    selection: [
      '按芯片手册推荐的 CL 选晶振，再反推外部匹配电容。',
      '晶振紧贴芯片引脚放，走线短而对称，下方地平面保持完整。',
      '对成本敏感且精度要求不高时，直接用 MCU 内部 RC 振荡器省掉它。',
    ],
    pitfalls: [
      '老周：负载电容随手抓两颗 22pF 就焊？CL 不匹配，频偏几十 ppm，串口波特率都在飘。',
      '老周：晶振走线饶了半个板子还跨分割地，不起振算轻的，起振了也是 EMC 发射台。',
      '老周：32.768k 晶振拿手摸一下就不走了——低功耗振荡电路怕脏，焊完记得洗板。',
    ],
    pkg: {
      packages: ['HC-49S 直插（大铁壳）', '3225 / 2520 贴片无源晶振', '有源晶振 4 脚（Vcc/GND/OUT/EN）'],
      note: '实物照片位：HC-49S 与 3225 贴片晶振对比，旁边放两颗 18pF 匹配电容。金属壳通常接地以屏蔽。',
    },
    usedIn: [
      { chapter: 6, label: 'ESP32 的 40MHz 主时钟布局' },
      { chapter: 7, label: '负载电容计算与选型' },
    ],
    keywords: ['晶振', 'crystal', 'oscillator', '负载电容', '32.768', '时钟', 'ppm'],
  },
  {
    id: 'diode',
    name: '二极管',
    en: 'Diode',
    refdes: 'D',
    category: 'semi',
    tagline: '电流的单行道。',
    essence: '二极管：正向导通、反向关断的单向阀。',
    unlockChapter: 2,
    principle: [
      'P 型与 N 型半导体结合形成 PN 结。正向偏压超过门槛（硅管约 0.6~0.7V）时耗尽层被压薄，电流通过；反向偏压下只有微小漏电流，直到击穿。',
      '导通后压降近似恒定：硅管 Vf≈0.7V，肖特基约 0.2~0.4V。这个「恒定压降」特性被用来做整流、续流、防反接、钳位与检波。',
    ],
    analogy: '像地铁站的单向闸机：顺向推就开，逆向怎么推都不动。',
    params: [
      { param: '正向压降', symbol: 'Vf', unit: 'V', guide: '1N4148≈0.7V@10mA；肖特基 SS14≈0.4V@1A' },
      { param: '正向电流', symbol: 'If', unit: 'A', guide: '1N4148 仅 200mA；1N4007 为 1A；按需留 2 倍余量' },
      { param: '反向耐压', symbol: 'Vrrm', unit: 'V', guide: '1N4148 为 75V，1N4007 达 1000V；工作反压打 5 折' },
      { param: '反向恢复时间', symbol: 'trr', unit: 'ns', guide: '1N4148 约 4ns 适合信号；1N4007 慢，只能用在工频' },
      { param: '反向漏电流', symbol: 'Ir', unit: 'µA', guide: '肖特基漏电大（µA~mA 级），精密采样电路要避开' },
    ],
    selection: [
      '信号小电流用 1N4148 / BAT54；电源整流用 1N400x 或肖特基。',
      '续流、防反接优先肖特基：压降低、发热小、速度快。',
      '高频开关场景查 trr；普通 1N4007 用在 100kHz 上会烧给你看。',
    ],
    pitfalls: [
      '老周：二极管有方向！阴极那道色环（丝印竖线）对准原理图的横杠，焊反了整个回路不通。',
      '老周：拿 1N4007 给 200kHz 的开关电源续流，trr 太慢，热得能点烟。',
      '老周：肖特基防反接是好，可它的漏电流在电池待机电路里偷偷放你的电。',
    ],
    pkg: {
      packages: ['DO-35 / DO-41 直插（阴极色环）', 'SOD-323 / SMA 贴片（阴极丝印线）', 'SOT-23 双二极管共阴/共阳'],
      note: '实物照片位：DO-41 封装的 1N4007（灰色体+色环）与 SMA 贴片 SS14，放大镜下对比阴极标记。',
    },
    usedIn: [
      { chapter: 2, label: '单向导通实验' },
      { chapter: 3, label: '续流与钳位应用' },
    ],
    keywords: ['二极管', 'diode', '1N4148', '1N4007', '肖特基', '整流', '续流', '防反接'],
  },
  {
    id: 'led',
    name: '发光二极管',
    en: 'LED',
    refdes: 'LED / D',
    category: 'semi',
    tagline: '会发光的二极管，但必须喂限流电阻。',
    essence: 'LED：正向导通时把电能直接变成光的二极管。',
    unlockChapter: 1,
    lab: 'led',
    principle: [
      '本质还是 PN 结，只是选用了直接带隙半导体材料。电子与空穴复合时释放的能量以光子形式跑出来，波长（颜色）由材料带隙决定。',
      '它的伏安特性很陡：电压一过 Vf，电流指数飙升。所以 LED 不能直接接电源，必须串限流电阻或用恒流驱动，否则几秒内过流烧芯。',
    ],
    analogy: '像脾气很急的小灯：电压多给一点点，它就拼命吸电流，直到把自己烧了。',
    params: [
      { param: '正向压降', symbol: 'Vf', unit: 'V', guide: '红≈1.8~2.2V，黄绿≈2.0~2.4V，蓝/白≈2.8~3.4V' },
      { param: '额定电流', symbol: 'If', unit: 'mA', guide: '指示用途 2~5mA 已很亮；标称 20mA 是上限不是目标' },
      { param: '发光强度', symbol: 'Iv', unit: 'mcd', guide: '普通指示灯 50~300mcd；超高亮可达上万' },
      { param: '主波长', symbol: 'λd', unit: 'nm', guide: '红 620~630nm，绿 520~530nm，蓝 465~475nm' },
      { param: '视角', symbol: '2θ½', unit: '°', guide: '15°~30° 聚光刺眼，120° 散光适合指示' },
    ],
    selection: [
      '限流电阻按 R=(Vcc−Vf)/If 算，再往最近的 E24 档靠。',
      '3.3V 系统带蓝/白光 LED 余量很薄，Vf 离散时亮度差异明显。',
      '多颗 LED 不要共用一个限流电阻并联，电流会分配不均。',
    ],
    pitfalls: [
      '老周：LED 直接怼 5V？“啪”一声，一缕青烟，你的第一个电子烟花。限流电阻呢？！',
      '老周：长脚是正极（阳极），平口边是负极。贴片看背面绿点/丝印，别凭感觉。',
      '老周：两颗 LED 并联共用一个电阻，一颗先走另一颗跟着走——这叫热失控接力。',
    ],
    pkg: {
      packages: ['3mm / 5mm 直插圆头（平口标负极）', '0603 / 0805 贴片（背面有极性标记）', '5050 RGB / 大功率 1W+（需恒流驱动）'],
      note: '实物照片位：5mm 红绿蓝三颗直插 LED 与 0603 贴片对比，附限流电阻接线示意。',
    },
    usedIn: [
      { chapter: 1, label: '点亮第一颗 LED' },
      { chapter: 2, label: 'Vf 与限流电阻实测' },
    ],
    keywords: ['LED', '发光二极管', '限流', 'Vf', '正极', '恒流'],
  },
  {
    id: 'zener',
    name: '稳压二极管',
    en: 'Zener Diode',
    refdes: 'ZD / D',
    category: 'semi',
    tagline: '反向击穿也不坏，还顺便稳个压。',
    essence: '稳压管：工作在可控反向击穿区，把电压钳在固定值。',
    unlockChapter: 3,
    principle: [
      '普通二极管反向击穿就烧，稳压管经过特殊掺杂，击穿区陡峭且可逆。只要电流被限制在安全范围，它两端电压就稳定在标称值 Vz 附近。',
      '用法是「反向接入 + 串联限流电阻」：多余电压由电阻吃掉，稳压管把多余电流泄到地。输入波动时它自动调节泄流量，维持输出稳定。',
    ],
    analogy: '像水库的溢洪道：水位（电压）一到警戒线就开闸泄水，水位死死钉在警戒线。',
    params: [
      { param: '标称稳压值', symbol: 'Vz', unit: 'V', guide: 'BZT52 系列 2.4~75V；5.1V 附近温度系数最小' },
      { param: '额定功率', symbol: 'Pz', unit: 'W', guide: '贴片 SOD-123 约 0.5W；Iz×Vz 必须小于它' },
      { param: '最小稳定电流', symbol: 'Izk', unit: 'mA', guide: '低于它稳压值变软，一般保持 5mA 以上' },
      { param: '动态电阻', symbol: 'Zz', unit: 'Ω', guide: '越小稳压越硬，几 Ω~几十 Ω' },
      { param: '温度系数', symbol: 'TC', unit: 'mV/°C', guide: '低压管为负、高压管为正，5~6V 附近接近零' },
    ],
    selection: [
      '限流电阻按 R=(Vin−Vz)/(Iz+IL) 算，并校核 Vin 最高时的功耗。',
      '负载电流大就别用稳压管了，那是 LDO 的活。',
      '做 ADC 基准请出门左转 TL431，稳压管精度和温漂都不够格。',
    ],
    pitfalls: [
      '老周：稳压管正着接？那它就是一颗 0.7V 普通二极管，还纳闷为什么稳不了压。',
      '老周：不接限流电阻直接并电源上，它不叫稳压管，叫保险丝——一次性的。',
      '老周：负载一重输出电压就掉？先算算你留给稳压管的电流还剩几 mA。',
    ],
    pkg: {
      packages: ['DO-35 / DO-41 直插（如 1N47xx 系列）', 'SOD-123 / SOD-323 贴片（BZT52）', 'SOT-23 双稳压管（ESD 阵列）'],
      note: '实物照片位：DO-41 封装的 1N4733A（5.1V/1W）与 SOD-123 贴片 BZT52C5V1，均标注阴极色环/丝印线。',
    },
    usedIn: [{ chapter: 3, label: '过压钳位与简易稳压' }],
    keywords: ['稳压管', 'zener', '齐纳', '钳位', '击穿', 'BZT52', '1N47'],
  },
  {
    id: 'npn',
    name: 'NPN 三极管',
    en: 'NPN BJT',
    refdes: 'Q',
    category: 'semi',
    tagline: '小电流指挥大电流的电流放大器。',
    essence: 'NPN 三极管：基极小电流控制集电极大电流。',
    unlockChapter: 2,
    principle: [
      '两层 N 型半导体夹一层薄薄的 P 型。基极-发射极之间是一个二极管，Vbe≈0.7V 导通后，基极每注入 1 份电流，集电极允许流过 β 份电流：Ic=β·Ib。',
      '两个工作区要分清：放大区（Ic=βIb，模拟放大用）与饱和区（Vce≈0.2V，开关用）。当开关用时要给足基极电流让它「饱和到底」，按 Ic/10 估算强制 β。',
    ],
    analogy: '像水库闸门旁的小舵轮：手拧小舵轮（基极电流），闸门（集电极电流）大开大合。',
    params: [
      { param: '电流放大倍数', symbol: 'hFE / β', unit: '—', guide: 'S8050 约 120~400，离散性极大，设计按最低值算' },
      { param: '集电极电流', symbol: 'Ic', unit: 'A', guide: 'S8050 为 500mA；2N2222 约 800mA；再大请用 MOSFET' },
      { param: '集射耐压', symbol: 'Vceo', unit: 'V', guide: 'S8050 为 25V，2N2222 为 40V，感性负载留 2 倍' },
      { param: '饱和压降', symbol: 'Vce(sat)', unit: 'V', guide: '深度饱和约 0.1~0.3V，发热 P=Vce(sat)×Ic' },
      { param: '基射压降', symbol: 'Vbe', unit: 'V', guide: '导通约 0.6~0.7V，基极限流电阻按 (Vin−0.7)/Ib 算' },
    ],
    selection: [
      '小信号开关选 S8050/2N2222；>1A 的负载直接上 NMOS，别为难三极管。',
      '当开关用：基极电流按 Ic/10 给，确保饱和，否则管子发热严重。',
      '驱动继电器记得在线圈两端并续流二极管（1N4148 即可）。',
    ],
    pitfalls: [
      '老周：基极不接限流电阻直接怼 IO 口？单片机的脚就是给你这么烧的。',
      '老周：Ic=βIb 当圣旨，β 取 300 去设计开关——饱和不足管子烫得能煎蛋。强制 β=10 记牢。',
      '老周：发射极和集电极焊反了它也能「工作」，β 只剩个位数，别问我怎么知道的。',
    ],
    pkg: {
      packages: ['TO-92 直插（S8050/2N2222，平面向字）', 'SOT-23 贴片（丝印如 J3Y=S8050）', '注意同封装不同厂引脚顺序可能不同！'],
      note: '实物照片位：TO-92 与 SOT-23 各一颗，放大标注 E/B/C 引脚。提醒：买料先看数据手册的引脚图。',
    },
    usedIn: [
      { chapter: 2, label: '三极管开关实验' },
      { chapter: 3, label: '三极管驱动继电器' },
    ],
    keywords: ['三极管', 'NPN', 'BJT', 'S8050', '2N2222', '基极', '饱和', '放大'],
  },
];

// —— 第二批：MOSFET / 运放 / ESP32 / 机电与射频 ——
ENTRIES.push(
  {
    id: 'nmos',
    name: 'NMOS 场效应管',
    en: 'N-Channel MOSFET',
    refdes: 'Q',
    category: 'semi',
    tagline: '电压控制的开关，几乎不耗驱动电流。',
    essence: 'NMOS：栅极电压控制漏源导通，导通后就是一个毫欧级电阻。',
    unlockChapter: 5,
    principle: [
      '栅极与沟道之间隔着一层二氧化硅，直流上几乎不吸电流。栅源电压 Vgs 超过阈值后，沟道反型导通，漏源之间呈现一个很小的电阻 Rds(on)。',
      '与三极管「电流放大」不同，MOS 是「电压控制电阻」。导通损耗 P=I²×Rds(on)，所以大电流开关首选低 Rds(on) 的 MOS。栅极是个电容（Ciss），开关瞬间需要充放电电流，频繁开关要考虑栅极驱动。',
    ],
    analogy: '像一扇电控水闸：旋钮（栅压）本身不流水，拧到位闸板就完全打开。',
    params: [
      { param: '导通电阻', symbol: 'Rds(on)', unit: 'mΩ', guide: 'AO3400 约 30mΩ@4.5V；注意是在哪个 Vgs 下测的' },
      { param: '漏源耐压', symbol: 'Vds', unit: 'V', guide: 'AO3400 为 30V；感性负载按 1.5~2 倍留量' },
      { param: '漏极电流', symbol: 'Id', unit: 'A', guide: '手册值是理想散热下的，实际按 3~5 折看' },
      { param: '栅极阈值', symbol: 'Vgs(th)', unit: 'V', guide: 'AO3400 约 0.5~1.4V；3.3V IO 驱动要选「逻辑电平」管' },
      { param: '栅极电荷', symbol: 'Qg', unit: 'nC', guide: '高频开关的驱动损耗来源，PWM 调光要查' },
    ],
    selection: [
      '3.3V/5V IO 直驱选逻辑电平 NMOS（Vgs(th) 远低于驱动电压）。',
      '大电流先看 Rds(on) 算发热，再看封装散热能力。',
      '栅极串 10~100Ω 电阻抑制振铃，并加 10kΩ 下拉防上电浮空误导通。',
    ],
    pitfalls: [
      '老周：拿 IRF540 这种 10V 驱动的管子接 3.3V IO，半开不开热得冒烟——看 Vgs(th) 之前先看 Rds(on) 的测试条件。',
      '老周：栅极悬空，管子自己开了。MOS 栅极是电容，没有下拉就是根天线。',
      '老周：体二极管是娘胎里带的，想靠它防反接？方向先想清楚。',
    ],
    pkg: {
      packages: ['SOT-23（AO3400 等小信号管）', 'SOP-8 / DFN 功率管', 'TO-220 大功率（需散热片）'],
      note: '实物照片位：SOT-23 封装的 AO3400 与 TO-220 的 IRF 系列对比。G/D/S 引脚顺序务必查手册。',
    },
    usedIn: [{ chapter: 5, label: 'MOS 开关与 PWM 调光' }],
    keywords: ['NMOS', 'MOSFET', 'AO3400', 'Rds', '场效应管', '开关', '逻辑电平'],
  },
  {
    id: 'pmos',
    name: 'PMOS 场效应管',
    en: 'P-Channel MOSFET',
    refdes: 'Q',
    category: 'semi',
    tagline: '高边开关的主角，栅极拉低才开。',
    essence: 'PMOS：栅极相对源极为负时导通，擅长做电源高边开关。',
    unlockChapter: 5,
    principle: [
      '与 NMOS 互补：源极接电源正，栅极拉到比源极低 |Vgs(th)| 以上时导通，拉到与源极同电位时关断。逻辑和直觉相反——「拉低开，拉高关」。',
      '它最大的舞台是高边开关与电源防反接：串在电源正极，导通压降仅 I×Rds(on)，比肖特基二极管方案损耗小得多。代价是同规格下 Rds(on) 比 NMOS 高、选择少。',
    ],
    analogy: '像装在水管上游的电控阀：控制端要「往下拽」才开，松手（拉高）自动关。',
    params: [
      { param: '导通电阻', symbol: 'Rds(on)', unit: 'mΩ', guide: 'AO3401 约 50mΩ@-4.5V；同尺寸比 NMOS 高一截' },
      { param: '漏源耐压', symbol: 'Vds', unit: 'V', guide: 'AO3401 为 -30V；负号表示源极为高电位' },
      { param: '漏极电流', symbol: 'Id', unit: 'A', guide: 'AO3401 约 -4A，实际按散热打折' },
      { param: '栅极阈值', symbol: 'Vgs(th)', unit: 'V', guide: 'AO3401 约 -0.5~-1.3V，确认驱动电压能拉够低' },
      { param: '最大栅源电压', symbol: 'Vgs(max)', unit: 'V', guide: '常见 ±12V 或 ±20V，高边驱动别超压击穿栅氧' },
    ],
    selection: [
      '电源防反接：PMOS 源极进、漏极出，栅极经电阻下地，正接自动导通。',
      '高边开关：栅极用一颗小 NPN 或开漏 IO 拉低，注意 Vgs 别超限。',
      '电流 >2A 时优先核算温升，必要时换更大封装或用 NMOS+高边驱动。',
    ],
    pitfalls: [
      '老周：拿 NMOS 的思路接 PMOS，板子上电就直通——PMOS 是拉低才开，逻辑整个反过来。',
      '老周：24V 系统用 Vgs(max)±20V 的管做高边开关，栅极直接拉到地，啪，栅氧击穿。分压电阻呢？',
      '老周：防反接电路把源漏方向焊反，体二极管直接导通，防了个寂寞。',
    ],
    pkg: {
      packages: ['SOT-23（AO3401）', 'SOP-8 功率 PMOS', '与 NMOS 同封装时注意 G/S/D 脚位差异'],
      note: '实物照片位：SOT-23 的 AO3401 与 AO3400 并排，标注两者电路中的摆放方向差异（高边 vs 低边）。',
    },
    usedIn: [{ chapter: 5, label: '高边开关与电源防反接' }],
    keywords: ['PMOS', 'MOSFET', 'AO3401', '高边开关', '防反接', '场效应管'],
  },
  {
    id: 'opamp',
    name: '运算放大器',
    en: 'Op-Amp',
    refdes: 'U',
    category: 'ic',
    tagline: '差分放大万倍，靠反馈干活。',
    essence: '运放：用负反馈把「无限大增益」驯服成精确放大器。',
    unlockChapter: 5,
    lab: 'opamp',
    principle: [
      '开环增益高达 10⁵ 倍以上，单独没法用；接上负反馈后，运放会拼命调整输出，让两个输入端电压相等——这就是「虚短」。输入阻抗极高，几乎不吸电流——这是「虚断」。',
      '反相放大 G=−Rf/Rin，同相放大 G=1+Rf/Rin，增益完全由外部电阻决定。输出永远被电源轨夹住：信号幅度超过供电范围就削顶（饱和），LM358 这类老运放输出还摸不到正电源轨。',
    ],
    analogy: '像一个极度较真的天平管理员：你给它负反馈，它就拼命让两端读数一样。',
    params: [
      { param: '增益带宽积', symbol: 'GBW', unit: 'MHz', guide: 'LM358 约 1MHz；增益 10 倍时带宽只剩 1/10' },
      { param: '输入失调电压', symbol: 'Vos', unit: 'mV', guide: 'LM358 典型 2mV；小信号放大必须考虑' },
      { param: '摆率', symbol: 'SR', unit: 'V/µs', guide: 'LM358 约 0.5V/µs，大信号高频会变三角波' },
      { param: '轨到轨', symbol: 'RRIO', unit: '—', guide: 'MCP6002 支持；LM358 输入到不了正轨，输出差正轨 1.5V' },
      { param: '供电范围', symbol: 'Vs', unit: 'V', guide: 'LM358 单电源 3~32V 或双电源 ±1.5~±16V' },
    ],
    selection: [
      '单电源小信号选轨到轨运放（MCP600x/OPA 系列）；双电源经典场合 LM358/TL072 仍堪用。',
      '先看 GBW：目标带宽×闭环增益 < GBW，留 5~10 倍余量。',
      '反馈电阻取 1kΩ~100kΩ：太小费电，太大引入噪声与偏置误差。',
    ],
    pitfalls: [
      '老周：LM358 单电源放大 20mV 传感器信号，输出贴着地不动——失调电压比信号还大，先想想虚短虚断的前提。',
      '老周：增益 100 倍还想通过 100kHz 信号？GBW 1MHz 除以 100 只剩 10kHz，波形糊了别怪运放。',
      '老周：同相输入端悬空，输出随机乱跳——虚断不是断路，偏置电流需要回路，对地接个电阻。',
    ],
    pkg: {
      packages: ['DIP-8 直插双运放（LM358）', 'SOP-8 / MSOP-8 贴片', '单运放 SOT-23-5（如 MCP6001）'],
      note: '实物照片位：DIP-8 的 LM358 与 SOP-8 贴片对比，标注 1 脚定位圆点。半圆缺口/圆点方向即引脚 1。',
    },
    usedIn: [{ chapter: 5, label: '反相/同相放大与有源滤波' }],
    keywords: ['运放', 'opamp', 'LM358', 'MCP6002', '虚短', '虚断', '反相', '同相', 'GBW'],
  },
  {
    id: 'esp32',
    name: 'ESP32 模组',
    en: 'ESP32-WROOM Module',
    refdes: 'U / MOD',
    category: 'ic',
    tagline: '自带 Wi-Fi 与蓝牙的双核单片机。',
    essence: 'ESP32 模组：3.3V 供电的无线 MCU 系统级封装。',
    unlockChapter: 6,
    principle: [
      '模组内部集成了 ESP32 芯片、40MHz 晶振、Flash 与射频匹配电路，引出排针即是一整个最小系统的大部分。双核 Xtensa 处理器，主频最高 240MHz。',
      '供电是第一大坑：Wi-Fi 发射瞬间电流峰值超过 500mA，3.3V 电源必须供得上、去耦必须足，否则就是「一通 Wi-Fi 就复位」。IO 电平是 3.3V，不耐 5V。',
    ],
    analogy: '像一台已经装好发动机的车架：你只需接油（电源）、方向盘（IO）和钥匙（EN），剩下的它自己搞定。',
    params: [
      { param: '工作电压', symbol: 'Vdd', unit: 'V', guide: '3.0~3.6V，标称 3.3V；IO 不耐 5V，需电平转换' },
      { param: '峰值电流', symbol: 'Ipeak', unit: 'mA', guide: '平均百 mA 级、瞬时峰值 >500mA，电源按 ≥500mA 设计' },
      { param: '启动电流', symbol: 'Iboot', unit: 'mA', guide: '上电瞬时较大，EN 与 3V3 需足够去耦' },
      { param: 'IO 驱动能力', symbol: 'Iio', unit: 'mA', guide: '单脚约 20mA（建议 12mA 内），别直驱 LED 阵列' },
      { param: 'ADC 范围', symbol: 'Vadc', unit: 'V', guide: '衰减 12dB 档约 0~3.1V；ADC2 与 Wi-Fi 同时使用冲突' },
    ],
    selection: [
      '3.3V 电源至少 1A 裕量，10µF+100nF 去耦紧贴 3V3 引脚。',
      'EN 脚上拉 10kΩ 并接 1µF 电容到地，上电复位时序才稳。',
      'IO0 上拉、IO2 下拉决定启动模式；下载失败先查这两个脚。',
      '模组天线区下方整层挖空（keepout），禁铺铜禁走线。',
    ],
    pitfalls: [
      '老周：拿 3.3V 200mA 的 LDO 喂 ESP32，一连 Wi-Fi 就重启——这不是 bug，是电源在求救。',
      '老周：5V 信号直接怼 IO，芯片没立刻坏是运气好，累积损伤迟早发作。电平转换器几毛钱。',
      '老周：GPIO34~39 只有输入没有输出，还纳闷怎么点不亮灯——脚位功能表先读三遍。',
    ],
    pkg: {
      packages: ['ESP32-WROOM-32 模组（半孔邮票边）', '开发板形态（NodeMCU/DevKitC，含 USB 转串口）', '注意模组天线净空区禁铜'],
      note: '实物照片位：WROOM-32 模组特写，可见金属屏蔽罩、板载蛇形天线与半孔焊盘；旁边放一颗 USB 转串口芯片示意烧录链路。',
    },
    usedIn: [
      { chapter: 6, label: '无线传感器节点与 RF 布局' },
      { chapter: 7, label: '毕业设计 ESP32 最小系统板' },
    ],
    keywords: ['ESP32', 'Wi-Fi', '蓝牙', '单片机', 'MCU', '3.3V', 'GPIO', '模组'],
  },
  {
    id: 'switch',
    name: '开关与按键',
    en: 'Switch / Tact Button',
    refdes: 'SW / KEY',
    category: 'mech',
    tagline: '最老的元件，最烦的抖动。',
    essence: '开关：机械触点通断电路，简单却伴随抖动。',
    unlockChapter: 2,
    lab: 'pullup',
    principle: [
      '靠金属弹片的机械接触导通电流。按下瞬间触点会弹跳数次，产生 5~20ms 的快速通断序列——这就是「按键抖动」，数字电路会把每一次弹跳都当成一次按下。',
      '去抖两招：硬件（RC 低通 + 施密特触发整形）或软件（采样延时 10~20ms 二次确认）。接 MCU 时配合上拉/下拉电阻，让松开态有确定电平。',
    ],
    analogy: '像皮球落地：你以为只碰了一下，其实哒哒哒弹了好几下才停稳。',
    params: [
      { param: '触点额定电流', symbol: 'I', unit: 'A', guide: '轻触按键仅 50mA/12VDC，别拿去切电源主回路' },
      { param: '抖动时间', symbol: 'tb', unit: 'ms', guide: '轻触按键 5~20ms，软件去抖延时取 20ms 稳妥' },
      { param: '机械寿命', symbol: '—', unit: '次', guide: '轻触按键 10 万~100 万次，拨动开关约 1 万次' },
      { param: '接触电阻', symbol: 'Rc', unit: 'mΩ', guide: '新件 <100mΩ，老化氧化后升高' },
      { param: '绝缘耐压', symbol: '—', unit: 'V', guide: '面板开关涉及安规，信号按键不敏感' },
    ],
    selection: [
      '接 MCU：轻触按键 + 10kΩ 上拉/下拉，或直接用芯片内部上拉。',
      '切电源/大电流：选明确标注额定值的船型/钮子开关。',
      '手感即品质：按压力 160~260gf 的轻触键手感干脆不易误判。',
    ],
    pitfalls: [
      '老周：按键不接上拉，松开时输入浮空，程序里按键「自己按下」——10kΩ 上拉又不花钱。',
      '老周：不做去抖，按一次计数加 7。先想想电流从哪来，再想想抖动从哪来。',
      '老周：拿 50mA 的轻触键去切 2A 的电源，触点烧蚀粘连，关都关不掉。',
    ],
    pkg: {
      packages: ['6×6mm 轻触按键（四脚两两内部相通！）', '拨动/船型开关', '带锁自锁按键'],
      note: '实物照片位：6×6 轻触按键底视图，标注哪两个引脚内部直通——布板时跨对角线接线最稳。',
    },
    usedIn: [{ chapter: 2, label: '按键输入与消抖' }],
    keywords: ['开关', '按键', 'switch', 'button', '抖动', '去抖', '轻触'],
  },
  {
    id: 'pot',
    name: '电位器',
    en: 'Potentiometer',
    refdes: 'RP / VR',
    category: 'mech',
    tagline: '可以拧的分压器。',
    essence: '电位器：滑动触点把固定电阻分成可调比例的两段。',
    unlockChapter: 2,
    principle: [
      '一条电阻膜两端固定，中间的滑动触点随旋钮移动，把总阻值分成 R1+R2。三脚用法是分压器（输出 0~100% 电压），两脚用法是可变电阻。',
      '分压规律分两种「 taper 」：线性（B 档）阻值随角度均匀变化，音量电位器用对数（A 档）匹配人耳听觉。多圈精密电位器（如 3296）可以拧 25 圈做细调。',
    ],
    analogy: '像水龙头：整根水管（电阻膜）不变，阀门位置决定冷热水的配比。',
    params: [
      { param: '总阻值', symbol: 'R', unit: 'kΩ', guide: '常用 1k/10k/50k/100kΩ；分压用 10kΩ 最百搭' },
      { param: '阻值规律', symbol: 'Taper', unit: '—', guide: 'B=线性（调压/调参），A=对数（音量）' },
      { param: '额定功率', symbol: 'P', unit: 'W', guide: '3296 仅 0.5W；WH148 约 0.05W，只走信号' },
      { param: '圈数', symbol: '—', unit: '圈', guide: '单圈 270°；3296 多圈 25 圈，精密细调' },
      { param: '机械寿命', symbol: '—', unit: '次', guide: '碳膜约 1 万次，频繁调节场合选导电塑料' },
    ],
    selection: [
      '做 ADC 输入采样：10kΩ 线性档，两端接 Vref/GND，中点进 ADC。',
      '校准用途选多圈 3296；用户面板调节选 WH148 单圈带旋钮。',
      '两脚可变电阻用法：中点与一端短接，触点滑脱时不会开路。',
    ],
    pitfalls: [
      '老周：WH148 当功率电阻串在电机回路里？碳膜几分钟就烧焦，它是信号元件。',
      '老周：3296 调基准电压，手一抖多拧两圈——多圈电位器调参要有耐心，数着圈来。',
      '老周：电位器中点悬空就敢上电，采样值满天飘——先确认三个脚谁是谁。',
    ],
    pkg: {
      packages: ['WH148 单圈（面板旋钮）', '3296 多圈精密（蓝色方块+顶调螺丝）', '3362 贴片微调'],
      note: '实物照片位：WH148 与 3296 并排。3296 侧面印有阻值代码（103=10kΩ），调节螺丝下是 25 圈丝杆。',
    },
    usedIn: [{ chapter: 2, label: '分压调节实验' }],
    keywords: ['电位器', 'potentiometer', '3296', 'WH148', '分压', '可调电阻'],
  },
  {
    id: 'fuse',
    name: '保险丝',
    en: 'Fuse',
    refdes: 'F',
    category: 'mech',
    tagline: '牺牲自己，保住全板。',
    essence: '保险丝：过流时率先熔断，切断故障回路。',
    unlockChapter: 7,
    principle: [
      '一段精确设计的低熔点导体串联在电源入口。电流过大时 I²t 发热使熔体熔断，把故障电流拦在板外。熔断速度分快断（F）与慢断/延时（T）。',
      '自恢复保险丝（PPTC）是另一路线：聚合物内嵌导电颗粒，过流发热后颗粒分离、阻值骤升限流；故障消失冷却后自动恢复。可恢复但有保持电流/动作电流之分。',
    ],
    analogy: '像大坝的泄洪牺牲段：洪水（过流）来了先冲垮它，保住下游整座城市。',
    params: [
      { param: '额定电流', symbol: 'In', unit: 'A', guide: '按正常工作电流的 1.5~2 倍选，再按 75% 降额使用' },
      { param: '熔断积分', symbol: 'I²t', unit: 'A²s', guide: '抗浪涌能力指标，电机/电容充电场合选慢断型' },
      { param: '额定电压', symbol: 'V', unit: 'V', guide: '熔断后要能可靠熄弧，直流比交流更难断' },
      { param: '分断能力', symbol: '—', unit: 'A', guide: '故障短路电流上限，玻璃管通常 35A 级' },
      { param: '保持/动作电流', symbol: 'Ihold/Itrip', unit: 'A', guide: 'PPTC 专用：Itrip 约为 Ihold 的 2 倍' },
    ],
    selection: [
      '入口第一颗元件就是它：电源进来先过保险丝，再谈别的。',
      '有上电浪涌（大电容充电）选慢断 T 型或 PPTC，否则开机就烧。',
      'PPTC 适合 USB 口等可插拔场合；一次性熔断用于故障即报废保护的场合。',
    ],
    pitfalls: [
      '老周：保险丝烧了换一根又烧？它是在替你报警，不是在跟你作对——先找短路点。',
      '老周：拿 5A 保险丝保护 500mA 的板子，等于没装。保险丝额定要贴着工作电流选。',
      '老周：PPTC 动作后不恢复？环境温度高时 Ihold 会降额，贴着发热元件放就是自找麻烦。',
    ],
    pkg: {
      packages: ['1206 / 0805 贴片一次性保险丝', 'PPTC 自恢复（贴片/直插圆片）', '玻璃管 5×20mm（带座）'],
      note: '实物照片位：1206 贴片保险丝（表面印额定电流代码）与一片直插 PPTC 圆片。丝印 F 位号提醒它串联在电源入口。',
    },
    usedIn: [{ chapter: 7, label: '整机电源入口保护设计' }],
    keywords: ['保险丝', 'fuse', 'PPTC', '自恢复', '过流保护', '快断', '慢断'],
  },
  {
    id: 'antenna',
    name: '天线',
    en: 'Antenna',
    refdes: 'ANT',
    category: 'mech',
    tagline: '把电信号撒向空气的那根线。',
    essence: '天线：把导行电磁波与自由空间波互相转换的结构。',
    unlockChapter: 6,
    principle: [
      '交变电流在导体中流动时向空间辐射电磁波。辐射效率与尺寸强相关：2.4GHz 的波长 λ≈125mm，四分之一波长约 31mm——这就是常见的鞭状天线长度。',
      '天线是一个 50Ω「端口」：射频走线要按 50Ω 特性阻抗设计（线宽与板厚/介电常数相关），链路里任何失配都会把能量反射回来。PCB 板载天线（倒 F、蛇形）对净空区极度敏感。',
    ],
    analogy: '像乐器喇叭口：琴弦（电路）的能量，要靠匹配形状的喇叭口才能高效送进空气。',
    params: [
      { param: '工作频段', symbol: 'f', unit: 'GHz', guide: 'Wi-Fi/BLE 用 2.4GHz（λ/4≈31mm）；Sub-G 用 433/868/915MHz' },
      { param: '特性阻抗', symbol: 'Z0', unit: 'Ω', guide: '射频链路统一 50Ω，馈线按叠层算线宽' },
      { param: '增益', symbol: 'G', unit: 'dBi', guide: 'PCB 板载约 0~2dBi；外置鞭状 2~5dBi' },
      { param: '驻波比', symbol: 'VSWR', unit: '—', guide: '<2 可用，越接近 1 匹配越好' },
      { param: '净空区', symbol: 'Keepout', unit: 'mm', guide: '板载天线周围与下方全层禁铜，按模组手册尺寸执行' },
    ],
    selection: [
      '快速出活：直接用带认证天线的模组（如 ESP32-WROOM），别自己画板载天线。',
      '射频走线短、直、50Ω，过孔能免则免；下方地平面完整连续。',
      '金属外壳、电池、液晶屏都会吃掉辐射，结构先行评估。',
    ],
    pitfalls: [
      '老周：板载天线底下铺了满满一层铜，还抱怨信号弱——净空区三个字认识吗？',
      '老周：射频走线绕 90° 直角还串俩过孔，阻抗断成三截，一半能量反射回去发热了。',
      '老周：把 2.4G 天线贴在金属边框上，实测距离从 50 米变 5 米，结构工程师笑而不语。',
    ],
    pkg: {
      packages: ['PCB 板载天线（倒 F / 蛇形，零成本但挑布局）', 'IPEX 座 + 外置鞭状天线', '陶瓷贴片天线（需匹配网络）'],
      note: '实物照片位：ESP32 模组上的蛇形 PCB 天线特写，标注净空区边界；旁边一个 IPEX 座与外置 2.4G 胶棒天线。',
    },
    usedIn: [{ chapter: 6, label: '天线匹配直觉与 RF 布局约束' }],
    keywords: ['天线', 'antenna', '2.4G', '50欧', '阻抗匹配', '净空区', 'RF'],
  },
);

export const ENTRY_MAP: Record<string, CodexEntry> = Object.fromEntries(
  ENTRIES.map(e => [e.id, e]),
);
