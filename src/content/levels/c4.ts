// 第 4 章 · PCB 布局布线（5 关）—— 封装、布局、45° 走线、地平面、DRC
// 单位约定：电压 V，电流 mA。LED Vf=2V，功率 LED Vf=3.2V。
import type { LevelDef } from '@/engine/types';

export const C4_LEVELS: LevelDef[] = [
  {
    id: 'c4-1',
    track: 'main',
    chapter: 4,
    index: 1,
    title: '从原理图到电路板',
    subtitle: '封装：元件的「脚印」',
    briefing:
      '欢迎进入 PCB 的世界！同样的 5V + LED 电路，这次要在「电路板」上完成。原理图里的元件符号，到了板上都变成了封装：0805 贴片电阻、5mm 直插 LED。放好元件、连好走线，让 LED 以 10~18mA 点亮。',
    intro: [
      { speaker: 'laozhou', text: '原理图是「想法」，PCB 是「实物」。电阻在原理图上是根弹簧，在板上是颗 2mm×1.25mm 的小黑片——那叫 0805 封装，数字是它的英制尺寸。' },
      { speaker: 'xiaohan', text: '0805 = 0.08 × 0.05 英寸！还有更小的 0603、0402，小到镊子都夹不稳！' },
      { speaker: 'laozhou', text: '封装画错，板子就废。多少老师傅栽在「原理图全对、封装错一毫米」上。养成习惯：画完封装，拿真元件比一比。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '板子上的第一盏灯亮了！这块铜板开始有灵魂了！' },
      { speaker: 'laozhou', text: '冷知识：0805 的「8」和「5」是百分之一英寸。但工程师嘴里的「0805」有时也指公制 2012——下单前一定确认单位，这是用真金白银买的教训。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
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
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次点亮', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      '电路和第 1 章一模一样：电源 → 电阻 → LED → 回电源。变的只是「舞台」从原理图换成了 PCB。',
      '限流电阻照旧：(5−2)÷13.6mA ≈ 220Ω。',
      'RP1 设 220Ω，连线 BT1.pos→RP1.a→RP1.b→LED1.a，LED1.k→BT1.neg。',
    ],
    knowledge: {
      title: '封装：原理图与现实的契约',
      body: '封装（Footprint）定义元件在 PCB 上的物理占位：焊盘位置、尺寸、丝印轮廓。常见贴片封装按英制尺寸命名：0402（1.0×0.5mm）、0603、0805（2.0×1.25mm）、1206，数字越小越难手工焊接；直插元件则用引脚间距标称，如 2.54mm 排针、7.62mm 的 DIP。选型权衡：小封装省空间、高频特性好，但功率低、返修难；0805 是手工焊接与密度的甜点。封装错误是打板翻车的头号原因——三极管引脚顺序（EBC/CBE）、电解电容正负、接插件防呆方向，每一个都值得对照数据手册检查三遍。老师傅的口头禅：「封装没过夜，打板不掏钱」。',
    },
    // 验算: I=(5−2)/220=13.6mA ∈ [10,18]mA ✓（同 c1-4）
  },
  {
    id: 'c4-2',
    track: 'main',
    chapter: 4,
    index: 2,
    title: '布局的顺序：三十年烧出来的经验',
    subtitle: '先连接器，再主芯片，电容贴脚',
    briefing:
      '一块 MCU 小板的布局任务：电源进来先放 MCU（U1），再给它配一颗 100nF 去耦电容，并联到电源脚与地之间（真实板子上要贴到 10mm 以内）；最后把 MCU 的 p0 引脚经限流电阻接到 LED。电路目标：电容容值 100nF±20%，LED 亮、电流 10~18mA。',
    intro: [
      { speaker: 'laozhou', text: '布局先放连接器，再放大芯片，最后让电容贴着芯片的电源脚——这是三十年烧出来的顺序。倒着来的人，都在加班改版。' },
      { speaker: 'xiaohan', text: '去耦电容是芯片的「贴身保镖」！离得远了，电源线上的毛刺就会欺负芯片！' },
      { speaker: 'laozhou', text: 'MCU 每次翻转输出，都会从电源脚上「咬一口」电流。电容离得近，这一口就近补给；离得远，整条电源线跟着抖。10mm，记住这个数。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '电容贴着 U1，LED 听 p0 的话——布局工整得像阅兵！' },
      { speaker: 'laozhou', text: '冷知识：去耦电容为什么常用 100nF？因为 MCU 的瞬态电流脉冲在纳秒到微秒级，100nF 的谐振点恰好覆盖这段。大电容管「水库」，小电容管「消防栓」，常见做法是 10µF 和 100nF 搭配。' },
    ],
    palette: [
      // 去耦电容手写落位：紧贴 U1 供电脚（本关教学点就是「10mm 内」）
      { id: 'CP1', type: 'capacitor', x: 224, y: 272 },
      // LED 限流电阻手写落位：LED 正下方，短程直连
      { id: 'RP1', type: 'resistor', x: 432, y: 464, params: { resistance: 220 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'U1', type: 'mcu', x: 320, y: 160, params: { pinVoltage: 5, current: 5 }, locked: true },
        { id: 'LED1', type: 'led', x: 544, y: 176, params: { vf: 2 }, locked: true },
        // 地星点放元件群质心下方：三路地线呈扇形汇入，不共用走廊
        { id: 'GND1', type: 'gnd', x: 288, y: 368, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'capacitor', count: 1 },
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'a' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'CP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'p0' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
      { kind: 'param', comp: 'CP1', param: 'capacitance', min: 80e-9, max: 120e-9 },
    ],
    stars: [
      { id: 'first-try', label: '布局一次到位', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '布局顺序：先把电容拖到 U1 旁边（10mm 内），再连线。供电、去耦、输出三条链路分开想清楚。',
      '三条链：BT1 给 U1 供电；CP1 并在 U1 的 vcc 与地之间；U1.p0 → RP1 → LED → 地。',
      'RP1 = 220Ω。U1 输出高电平 5V，LED 电流 (5−2)/220 ≈ 13.6mA。记得把 U1.gnd 也接地，并双击 U1，勾选 P0 输出高。',
    ],
    knowledge: {
      title: '去耦电容：芯片的贴身水库',
      body: '数字芯片工作时电流是脉冲式的：每次输出翻转，都在纳秒级时间内从电源脚抽取尖峰电流。电源走线存在寄生电感，尖峰电流一冲，电压就塌一个坑——这就是「地弹」和「电源噪声」的来源。去耦电容的作用是在芯片脚边提供一个低阻抗的本地电荷库：就近补给尖峰，平滑电压。位置比容量更重要：100nF 电容离电源脚每远 10mm，走线电感就多约 10nH，高频去耦效果大打折扣，所以规范是紧贴电源脚、先过电容再进芯片。多电源脚的芯片每脚配一颗，入口再加 10µF 级「水库」。这条 10mm 原则，是无数「莫名死机」换来的。',
    },
    // 验算: U1.p0 高电平 5V，I=(5−2)/220=13.6mA ∈ [10,18]mA ✓；去耦电容 100nF 对直流开路，不影响电流 ✓
  },
  {
    id: 'c4-3',
    track: 'main',
    chapter: 4,
    index: 3,
    title: '走线的礼仪：45° 的世界',
    subtitle: '拒绝直角，优雅转弯',
    briefing:
      '在 PCB 上走线有条美学+工程的铁律：转弯只用 45°，不走 90° 直角。把 9V 分压电路（两颗 1kΩ）在板上布好，所有拐角用 45° 折线，中点输出 4.3~4.7V。',
    intro: [
      { speaker: 'laozhou', text: '看一块板子先看走线。90° 直角的板子，多半是新手干的——直角外侧容易蚀刻过度，尖角还是电磁骚扰的「小天线」。' },
      { speaker: 'xiaohan', text: '45° 转弯，电流跑得顺，板子看着也专业！强迫症狂喜！' },
      { speaker: 'laozhou', text: '高速信号里直角还会造成阻抗突变、信号反射。虽然现在 EDA 会自动把直角切成 45°，但手上的功夫和眼里的审美，得自己练。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '走线像书法一样流畅！4.5V 稳稳定在中点！' },
      { speaker: 'laozhou', text: '冷知识：更高阶的玩法叫「蛇形等长走线」——DDR 内存的数据线故意绕出波浪，只为让每根线的长度分毫不差。信号跑得比光慢，但比你想的快得多。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 9 }, locked: true },
        { id: 'R1', type: 'resistor', x: 272, y: 96, params: { resistance: 1000 }, locked: true },
        { id: 'R2', type: 'resistor', x: 272, y: 256, params: { resistance: 1000 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'R2', port: 'a' } },
      { kind: 'connected', a: { comp: 'R2', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'node-voltage', node: { comp: 'R2', port: 'a' }, min: 4.3, max: 4.7 },
      { kind: 'param', comp: 'R2', param: 'resistance', min: 900, max: 1100 },
    ],
    stars: [
      { id: 'first-try', label: '走线一次合格', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    hints: [
      '电路本身是最简单的等比分压：9V 被两颗 1kΩ 平分。先保证电气连通，再调整走线形状。',
      '连线时每次转弯都走一格斜线（45°）再拐回来，避免直接垂直转弯。',
      '拓扑：BT1.pos→R1→R2→GND，BT1.neg→GND。中点 V=9×1k/2k=4.5V。走线全部用斜角段。',
    ],
    knowledge: {
      title: '为什么走线钟爱 45°',
      body: 'PCB 走线避免 90° 直角有三层原因。工艺层：蚀刻时直角外角药液流动快、内角慢，容易造成过度蚀刻和线宽不均，细线尤其危险。电气层：直角拐角等效线宽突变，高频信号经过会产生阻抗不连续，引起反射；尖角还会集中电场，成为 EMI 辐射源。可靠性层：尖角处铜箔应力集中，热胀冷缩下容易开裂。45° 折角把突变拆成两次缓和的转向，是工业界通行的妥协；射频领域更进一步使用圆弧走线。现代 EDA 都有「推挤走线」「泪滴焊盘」等自动化工具，但布线的美感与直觉——哪条线先走、往哪儿绕——依然是工程师的核心手艺。',
    },
    // 验算: 等比分压 V中点=9×1k/(1k+1k)=4.5V ∈ [4.3,4.7]V ✓（裕量 ±4.4%）
  },
  {
    id: 'c4-4',
    track: 'main',
    chapter: 4,
    index: 4,
    title: '地平面：所有电流的家',
    subtitle: '回路面积越小越好',
    briefing:
      '「此处地平面不可分割」——丝印上的这句话是第 4 章最重要的忠告。布一块双 LED 小板：两颗 LED 各配 220Ω 电阻，所有地线汇入同一片地平面，禁止绕远路形成大环路。两灯各 10~18mA 点亮。',
    intro: [
      { speaker: 'laozhou', text: '人人盯着信号线，高手盯着地线。每条信号出去，都要有一条电流从地回来——回路围出的面积越大，拾取的干扰越多，辐射也越强。' },
      { speaker: 'xiaohan', text: '所以地要铺成一整片「铜海」！电流想回家，随时有最近的路！' },
      { speaker: 'laozhou', text: '地平面最忌讳被走线切开一条缝——回流绕远，噪声四起。记住：分割地平面的每一刀，都可能是一次改板。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '双灯齐亮，地线整整齐齐回家！' },
      { speaker: 'laozhou', text: '冷知识：EMC（电磁兼容）测试室里，一半的整改案例最后都落到「地回路没走好」。省下的每一平方毫米环路面积，都是未来少掉的辐射超标。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 192, params: { voltage: 5 }, locked: true },
        { id: 'LED1', type: 'led', x: 384, y: 96, params: { vf: 2 }, locked: true },
        { id: 'LED2', type: 'led', x: 384, y: 288, params: { vf: 2 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 96, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'LED2', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'LED2', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'led-lit', comp: 'LED2' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
      { kind: 'branch-current', comp: 'LED2', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '布局布线一次合格', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '7 分钟内完成', check: 'time', value: 420 },
    ],
    hints: [
      '电路 = c3-2 的双灯并联。难点在「地」：两颗 LED 的阴极都要用尽量短的路径汇入 GND1。',
      '地线走板子下沿一整条直铜，两灯阴极垂直搭上去——这就是微缩版地平面。',
      '两颗 220Ω，支路电流各 13.6mA。地汇成一条主线，不要有悬空的地线头。',
    ],
    knowledge: {
      title: '回流路径：被忽视的主角',
      body: '信号电流是「去」与「回」的闭环：高频回流会自动贴着信号线下方的地平面走（路径电感最小）。地平面完整，回路面积就小，电磁辐射和抗扰度都好；地平面被一条走线缝切开，回流被迫绕行，回路面积暴增几十倍——这是 EMC 翻车的经典剧本。实践守则：其一，两层板尽量留一整层做地；其二，跨分割区的信号线是禁忌；其三，去耦电容的地脚要短而粗地接入地平面；其四，数字地与模拟地只在一点汇合（单点接地），防止数字噪声灌进模拟区。「电流总会回家，问题是你给它修了条什么路。」',
    },
    // 验算: 每支路 I=(5−2)/220=13.6mA ∈ [10,18]mA ✓（同 c3-2）
  },
  {
    id: 'c4-5',
    track: 'main',
    chapter: 4,
    index: 5,
    title: 'DRC 大作战：规则就是生命线',
    subtitle: '电流多大，线就多宽',
    briefing:
      '章底实战：驱动一颗功率 LED（Vf=3.2V，工作电流 60~110mA）。12V 电源已备好。两个考点：限流电阻选对阻值，还要把它的额定功率提到 1W 以上——大电流下，普通 1/4W 电阻会变成小烙铁。走线宽度与 DRC 的门道，知识卡里讲。',
    intro: [
      { speaker: 'laozhou', text: 'DRC——设计规则检查，板厂和你的最后一道保险。间距不够会短路，线太细会发热。1mm 宽的线大约能扛 1A，按这个手感倒推。' },
      { speaker: 'xiaohan', text: '88mA 的电流，0.5mm 的线宽绰绰有余！但细线党会被 DRC 无情打回！' },
      { speaker: 'laozhou', text: '每次点「下单」之前跑一次 DRC，就像飞行员起飞前绕机检查。规则不是束缚，是前人烧板子烧出来的护身符。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: 'DRC 全绿！功率 LED 亮得像个小太阳！第 4 章通关！' },
      { speaker: 'laozhou', text: '冷知识：板厂生产 1 盎司铜厚的板子，0.5mm 线宽载 1A 温升约 10°C。想要更凉？加宽线、加厚铜、并联过孔——散热的功夫全在铜上。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 100, power: 0.25 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 12 }, locked: true },
        // 功率 LED：额定 120mA（imax=0.12A），工作电流 ~83mA 远高于普通 LED 的 20mA 默认额定
        { id: 'LED1', type: 'led', x: 384, y: 176, params: { vf: 3.2, imax: 0.12 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 82, max: 120 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 60, max: 110 },
      { kind: 'param', comp: 'RP1', param: 'power', min: 1 },
    ],
    stars: [
      { id: 'first-try', label: 'DRC 一次全绿', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '7 分钟内完成', check: 'time', value: 420 },
    ],
    hints: [
      '限流算法不变：R = (12 − 3.2) ÷ I。目标电流取中间值 88mA 左右。',
      'R = 8.8V ÷ 88mA = 100Ω。电阻功耗 P = I²R ≈ 0.77W，记得选 1W 以上的功率电阻。',
      'RP1 设 100Ω，并把它的 power 参数改成 1W（额定功率），接好回路即可全绿。',
    ],
    knowledge: {
      title: '线宽与载流：PCB 的热设计',
      body: '铜走线有电阻，电流流过就发热：温升由电流、线宽、铜厚共同决定。业界经验（IPC-2221，1oz 铜厚）：0.25mm 线约 0.5A，0.5mm 约 1A，1mm 约 2A（温升 10°C 量级）。本关 88mA 用 0.5mm 非常从容，但若换成 1A 的灯带还走 0.25mm 细线，板子会悄悄升温几十度，加速老化甚至起泡。DRC（设计规则检查）把关的不止线宽：最小间距（防短路/爬电）、最小孔径（防断钻）、丝印压焊盘（防虚焊）都在其中。功耗校核也别忘了元件：本关电阻发热 0.77W，用 0.25W 普通电阻必烧——规则之内是安全，规则之外是学费。',
    },
    // 验算: R=100Ω 时 I=(12−3.2)/100=88mA ∈ [60,110]mA ✓；R∈[82,120] → I∈[73,107]mA ⊂ [60,110] ✓
    // 电阻功耗 P=I²R=0.088²×100≈0.77W → 需 ≥1W 功率电阻（文案已提示）✓
    // LED imax=0.12A（功率 LED 额定 120mA）：led-lit 判据 83mA ≤ 1.5×imax=180mA ✓；3×imax=360mA，83mA 不烧毁 ✓
  },
];
