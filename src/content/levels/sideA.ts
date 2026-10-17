// 支线 A · ESP32 单片机入门（6 关）—— GPIO/PWM/ADC/上拉/中断/无线概念（块式伪代码概念在剧情与知识卡承载）
// 单位约定：电压 V，电流 mA。ESP32 GPIO 高电平 3.3V，LED Vf=2V。
import type { LevelDef } from '@/engine/types';

export const SIDE_A_LEVELS: LevelDef[] = [
  {
    id: 'sa-1',
    track: 'side-a',
    chapter: 1,
    index: 1,
    title: '你好，GPIO',
    subtitle: '芯片的第一个动作',
    briefing:
      '单片机之旅第一步：让 ESP32（一块会执行程序的小芯片）的 p0 引脚点亮一颗 LED。注意它的「手指」高电平是 3.3V（不是 5V！）——配一颗限流电阻（管住电流的减速带），让 LED 电流落在 4~9mA。概念上，程序只有两行：「设置 p0 为输出」「p0 输出高电平」。',
    intro: [
      { speaker: 'xiaohan', text: '欢迎来支线！单片机没那么神秘——GPIO（芯片的输入输出脚）就是芯片伸出来的「手指」：喊「高」它就举 3.3V，喊「低」它就落到 0V，还能摸一摸外面是高是低！' },
      { speaker: 'laozhou', text: 'ESP32 的 GPIO 是 3.3V 世界的居民，力气不大，一根手指只能推动十几 mA。点颗 LED 刚刚好；想直接带电机？那是三极管和 MOS 管这些「大力士」的活。' },
      { speaker: 'xiaohan', text: '程序超简单，就两句人话：「p0，你当输出！」「p0，举高！」——剩下的交给电路！' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '芯片的第一个「Hello World」不是打印字符，是点亮一颗灯！仪式感拉满！' },
      { speaker: 'laozhou', text: '冷知识：这根「手指」内部是两只小开关一推一拉：举高时接通 3.3V，放低时接通地——所以它既能「吐」电流也能「吞」电流。' },
    ],
    palette: [
      // 限流电阻手写落位：贴 LED 下方，p0 馈线与 LED 回流各自短程直连
      // P1 修复：出厂 1kΩ → 1.3mA 点不到 4~9mA；220Ω 要自己算
      { id: 'RP1', type: 'resistor', x: 416, y: 432, params: { resistance: 1000 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'U1', type: 'mcu', x: 288, y: 176, params: { pinVoltage: 3.3, current: 20 }, locked: true },
        { id: 'LED1', type: 'led', x: 512, y: 176, params: { vf: 2 }, locked: true },
        // 地星汇聚点放在元件群重心偏下：各路地线从两侧扇入，不再沿同一条对角走廊叠线
        { id: 'GND1', type: 'gnd', x: 352, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'p0' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 180, max: 270 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 4, max: 9 },
    ],
    stars: [
      { id: 'first-try', label: '一次点亮', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['GPIO 输出', '限流电阻'],
    formula: { expr: 'R = (Vcc − Vf) / If', vars: 'Vcc GPIO 高电平 3.3V、Vf LED 压降(V)、If 目标电流(A)', note: '(3.3 − 2) ÷ 6mA ≈ 220Ω；GPIO 一根手指最多推十几 mA' },
    hints: [
      '电路结构和主线点亮 LED 那关一样，唯一的变化：电压从 5V 变成了 3.3V。重新算一次限流电阻。',
      '电阻要消化 3.3 − 2 = 1.3V。想要 6mA 左右：R ≈ 220Ω。',
      'RP1 = 220Ω：I = 1.3/220 ≈ 5.9mA。供电、地、p0 输出三条链连好，并双击 U1，勾选 P0 输出高。',
    ],
    knowledge: {
      title: 'GPIO：芯片与世界的握手',
      body: 'GPIO（芯片的通用输入输出脚）是单片机伸出来的「手指」：程序让它当输出时，它就在 0V（低）和 3.3V（高）之间切换；让它当输入时，它就只「摸」不「推」，读出外面是高还是低。这根手指力气有限：一根最多推动十几 mA，所有手指加起来也有总限额——所以 LED 可以直接点，电机、继电器得请三极管或驱动芯片这些「大力士」帮忙。还有个重要提醒：3.3V 的手指很娇气，5V 的信号直接灌进来会把芯片打伤，不同电压世界的设备握手前要先「翻译」（电平转换）。本关 (3.3−2)÷220 ≈ 5.9mA，亮度温柔、芯片轻松，正是 GPIO 点灯的教科书用法。',
    },
    // 验算: I=(3.3−2)/220=5.9mA ∈ [4,9] ✓；R∈[180,270] → I∈[4.8,7.2]mA ⊂ [4,9] ✓
  },
  {
    id: 'sa-2',
    track: 'side-a',
    chapter: 1,
    index: 2,
    title: '呼吸之间：PWM 的魔法',
    subtitle: '占空比 = 平均电压',
    briefing:
      '让 LED「半亮」：不用改电阻，用 PWM——函数发生器 FG1 扮演 MCU 的 p1，输出 1kHz 方波（0~3.3V），把占空比调到 40~60%。平均电压 = 3.3V × 占空比，LED 亮度和平均值成正比。概念代码：「PWM(p1, 频率 1kHz, 占空比 50%)」。',
    intro: [
      { speaker: 'xiaohan', text: 'PWM 就是「超高速开关」！开一半时间、关一半时间，眼睛看到的是一半亮度——骗过眼睛的艺术！' },
      { speaker: 'laozhou', text: '数字引脚只有高和低两种状态，但平均电压可以是任意值：V平均 = V高 × 占空比。3.3V 的 50% 就是 1.65V。这是数字世界冒充模拟世界的看家本领。' },
      { speaker: 'laozhou', text: '频率别太低——低于 100Hz 人眼会看出闪烁。1kHz 以上，眼睛就被「滤波」了。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '半亮的 LED！如果把占空比从 0 慢慢加到 100%，就是「呼吸灯」！' },
      { speaker: 'laozhou', text: '冷知识：你手机屏幕的亮度调节，多数也是 PWM——低频 PWM 调光是部分人「看手机眼累」的元凶。工程选择的每一Hz，都连着人的感受。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
    ],
    preset: {
      components: [
        // P0-4 修复：PWM 源换成函数发生器（schema 支持 duty 编辑）——方波 0~3.3V / 1kHz，
        // duty 默认 0.1（太暗，需玩家调高）；扮演 MCU p1 的 PWM 输出，教学点不变
        { id: 'FG1', type: 'funcgen', x: 64, y: 176, params: { waveform: 'square', freq: 1000, vmin: 0, vmax: 3.3, duty: 0.1 }, locked: true },
        { id: 'LED1', type: 'led', x: 512, y: 176, params: { vf: 2 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'FG1', port: 'out' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'FG1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'FG1', param: 'duty', min: 0.4, max: 0.6 },
    ],
    stars: [
      { id: 'first-try', label: '一次调到半亮', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['PWM 占空比', '平均电压'],
    formula: { expr: 'Vavg = Vcc × D', vars: 'Vcc 高电平(V)、D 占空比(0~1)', note: '3.3V × 50% = 1.65V：LED 看到的等效电压，亮度跟着占空比走' },
    hints: [
      '电路与 sa-1 相似，只是驱动源换成函数发生器 FG1（扮演 MCU 的 PWM 引脚）。关键是 FG1 的 duty（占空比）参数。',
      'duty 默认 0.1（太暗），改成 0.5：平均电压 3.3×0.5=1.65V，LED 半亮。',
      'FG1 已预置方波 0~3.3V、1kHz，把 duty 设成 0.5；RP1 = 220Ω 接好 FG1.out→RP1→LED→地。',
    ],
    knowledge: {
      title: 'PWM：数字引脚的模拟梦',
      body: 'PWM（脉宽调制）以固定频率输出方波，用占空比编码「等效电压」：Vavg = Vcc × D。1kHz、50% 占空比的 3.3V 方波，对 LED、电机这类「慢」负载而言，与 1.65V 直流几乎没有区别。它统治着调光、电机调速、舵机角度、开关电源——凡是要「数字控制功率」的地方就有它。两个设计参数：频率要远高于负载的响应带宽（灯丝用几百 Hz，电机几 kHz，音频 D 类功放几百 kHz），否则负载会跟着抖动；分辨率由定时器位数决定，ESP32 的 LEDC 可到 16 位，65536 级亮度。配合 RC 低通滤波（c3-4 那一课），PWM 甚至能变成粗糙的 DAC——占空比扫起来，就是任意波形。',
    },
    sim: { duration: 10, probes: [{ comp: 'FG1', port: 'out' }] },
    // 验算: 导通相 I=(3.3−2)/220=5.9mA；占空比 0.5 → 平均电流≈2.95mA，平均电压 1.65V；LED 以等效亮度点亮 ✓
    // 目标为 duty 参数 + 连线（均为静态判定），可稳定保持 700ms 胜利条件 ✓
    // （瞬时 led-lit 会随方波相位翻转、无法持续 700ms，故验收不含它——见审计 §二.4：led-lit 只判 >1mA，本就无法区分「半亮」）
  },
  {
    id: 'sa-3',
    track: 'side-a',
    chapter: 1,
    index: 3,
    title: '按键的脾气：上拉与消抖',
    subtitle: '悬空的引脚会「闹鬼」',
    briefing:
      '把按键接到 p1 读状态。坑来了：按键松开时引脚悬空，电平随机漂移——必须加一颗上拉电阻把松开态「拽」回 3.3V。阻值多大合适？太大抗干扰差，太小按下时白费电流（本关验收窗口 8~12kΩ）。目标：按键未按下时 p1 稳定在 3.1~3.4V。',
    intro: [
      { speaker: 'xiaohan', text: '悬空的引脚是天线！手一靠近电平就乱跳，程序以为按键在疯狂蹦迪！上拉电阻就是它的定心丸！' },
      { speaker: 'laozhou', text: '上拉的逻辑：松开时，电阻把引脚轻轻拉到 3.3V（电流极小）；按下时，按键直接短路到地——「拽」不过「摁」，电平干净利落地变低。' },
      { speaker: 'laozhou', text: '10kΩ 是黄金值：太大会被干扰拽动，太小按下时浪费电流。ESP32 内部其实有内置上拉，但原理你必须懂。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '松开 = 稳稳的 3.3V！按下 = 果断的 0V！再也没有灵异事件！' },
      { speaker: 'laozhou', text: '冷知识：机械按键触点会「抖」——接通瞬间弹跳几次，波形上是一串毛刺。软件消抖（延时 20ms 再读）或硬件消抖（并一颗小电容）是必修课。看波形，比讲道理管用。' },
    ],
    palette: [
      // 上拉电阻手写落位：从上方馈入 p1，与下方按键的馈线上下分离不贴行
      // P1 修复：出厂 1kΩ 不在 8~12kΩ 窗口内，上拉阻值要玩家按功耗/抗扰折中选择
      { id: 'RP1', type: 'resistor', x: 256, y: 64, params: { resistance: 1000 } },
      { id: 'KEY1', type: 'button', x: 0, y: 0 },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'U1', type: 'mcu', x: 352, y: 176, params: { pinVoltage: 3.3, current: 20 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'component-placed', type: 'button', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'U1', port: 'p1' } },
      { kind: 'connected', a: { comp: 'KEY1', port: 'a' }, b: { comp: 'U1', port: 'p1' } },
      { kind: 'connected', a: { comp: 'KEY1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 8000, max: 12000 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'p1' }, min: 3.1, max: 3.4 },
    ],
    stars: [
      { id: 'first-try', label: '一次接对上拉', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['上拉电阻', '按键输入'],
    formula: { expr: 'I按下 = Vcc / R上拉', vars: 'Vcc 电源(V)、R上拉 上拉电阻(Ω)', note: '10kΩ 时按下仅 0.33mA；松开时引脚经电阻被拉到 3.3V，不再悬空' },
    hints: [
      '上拉结构：电源 → 电阻 → 引脚，引脚 → 按键 → 地。电阻和按键在引脚处「会师」。',
      '未按下时按键断开，引脚经电阻被拉到电源电压；输入引脚几乎不取电流，电阻上几乎没有压降。',
      'RP1 = 10kΩ：p1 = 3.3V。按 briefing 连好 RP1 到电源、p1 到按键两端。',
    ],
    knowledge: {
      title: '上拉电阻与按键消抖',
      body: '输入引脚是高阻态的「顺风耳」，悬空时会把环境电磁干扰当真信号——上拉电阻给它一个确定的默认态。选型逻辑：按下时流过电阻的电流 I = 3.3V/10kΩ = 0.33mA，微乎其微；若电阻换成 100Ω，按下就白白浪费 33mA。反之电阻太大（1MΩ），抗干扰能力下降、上升沿被寄生电容拖慢。10kΩ 是兼顾功耗与鲁棒性的行业默认值。消抖是另一半功课：机械触点闭合时会弹跳 5~20ms，波形上是密集毛刺，直接读会得到一串「按下-松开-按下」。对策分两路：软件延时 20ms 后重读，或硬件给引脚并一颗 100nF 电容做 RC 低通——又是 τ = RC 的老朋友。中断驱动的按键尤其需要消抖，否则一次按键触发十次中断。',
    },
    // 验算: 按键断开时输入引脚高阻几乎不取流 → p1≈3.3V ∈ [3.1,3.4] ✓；
    // 若按下：p1=0V，流过电阻 I=3.3/10k=0.33mA，功耗可忽略 ✓
  },
  {
    id: 'sa-4',
    track: 'side-a',
    chapter: 1,
    index: 4,
    title: '读世界的 ADC',
    subtitle: '旋钮一转，数字跟着走',
    briefing:
      '把电位器（10kΩ）接在 3.3V 与地之间，抽头送进 p0 的 ADC 通道，把抽头调到正中——目标读数电压 1.5~1.8V（3.3V 的一半，12 位 ADC 约 2048）。这正是所有旋钮、摇杆、滑杆的工作原理。',
    intro: [
      { speaker: 'xiaohan', text: 'ADC 是 MCU 的「模拟舌头」！电压舔一口，数字吐出来！0~3.3V 对应 0~4095！' },
      { speaker: 'laozhou', text: '3.3V 的 12 位 ADC，每一格 0.8mV。电位器旋钮每转一度，数字跳十几格——亲手拧一次，比看十页书更能理解「分辨率」。' },
      { speaker: 'laozhou', text: '注意 ESP32 的 ADC 是非完美器件：两端有非线性，工程上要么校准，要么只用中间段。手册里的曲线不是装饰品。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '读数 2048！旋钮的正中点！你对 ADC 的直觉毕业了！' },
      { speaker: 'laozhou', text: '冷知识：游戏手柄的摇杆就是两只互相垂直的电位器；无人机遥控的油门、航向，全是 ADC 读数。你打的每一局游戏，都在用今天这个电路。' },
    ],
    palette: [
      // P1 修复：出厂 wiper=0.2（0.66V）不是中点，0.5 要玩家自己调
      { id: 'RP1', type: 'pot', x: 0, y: 0, params: { resistance: 10000, wiper: 0.2 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'U1', type: 'mcu', x: 352, y: 176, params: { pinVoltage: 3.3, current: 20 }, locked: true },
        { id: 'GND1', type: 'gnd', x: 64, y: 336, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'pot', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'w' }, b: { comp: 'U1', port: 'p0' } },
      { kind: 'param', comp: 'RP1', param: 'wiper', min: 0.45, max: 0.55 },
      { kind: 'node-voltage', node: { comp: 'RP1', port: 'w' }, min: 1.5, max: 1.8 },
    ],
    stars: [
      { id: 'first-try', label: '一次调到位', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['电位器分压', 'ADC 量化'],
    formula: { expr: 'Vw = Vcc × wiper', vars: 'Vcc 电源 3.3V、wiper 抽头位置(0~1)', note: 'wiper = 0.5 → 1.65V，12 位 ADC 读数约 2048' },
    hints: [
      '电位器 = 可调分压器：a 接 3.3V、b 接地、w 输出。wiper 参数 0~1 就是旋钮位置。',
      '正中点 wiper = 0.5：V = 3.3 × 0.5 = 1.65V，对应 12 位 ADC 读数 2048。',
      'RP1 两端接电源与地，w 接 p0，wiper 设 0.5。',
    ],
    knowledge: {
      title: '电位器、ADC 与人机输入',
      body: '电位器是最直观的模拟传感器：机械位置 → 分压比 → 电压。10kΩ 是 ADC 场景的黄金阻值——抽头正中时输出内阻为上下臂并联 2.5kΩ，远小于 ADC 输入要求，采样又快又准。3.3V 量程、12 位分辨率意味着每格 0.8mV，抽头每移动 1‰ 位置读数变化约 4 格。工程实用技巧：读数先丢最低 2 位（噪声使然），或连续采样 8 次取平均；量程两端留出 5% 死区，避开电位器端点接触不良与 ADC 非线性区。从调音台推子到工业阀门反馈，「位置 → 分压 → ADC」这条链路几十年没变过——因为它简单、便宜、可靠，这正是好设计的标准。',
    },
    // 验算: V=3.3×0.5=1.65V ∈ [1.5,1.8] ✓；wiper∈[0.45,0.55] → V∈[1.485,1.815]，与目标交集要求 wiper∈[0.455,0.545]；提示引导 0.5±0.04 ✓；ADC 读数=1.65/3.3×4095≈2048 ✓
  },
  {
    id: 'sa-5',
    track: 'side-a',
    chapter: 1,
    index: 5,
    title: '中断：别一直盯着看',
    subtitle: '事件驱动的直觉',
    briefing:
      '按键按下，LED 立刻点亮。轮询写法是程序不停问「按了没？按了没？」；中断写法是硬件替你站岗，按键一动作立刻通知。本关电路：按键带上拉接 p1（中断脚），LED 接 p0。电路目标与 sa-3、sa-1 一致，中断的哲学请细品知识卡。',
    intro: [
      { speaker: 'xiaohan', text: '轮询 = 每秒问一百遍「有事吗」；中断 = 装个门铃，有事它叫你！CPU 终于可以安心睡觉了！' },
      { speaker: 'laozhou', text: '中断的本质是硬件事件抢占程序流程：按键边沿一到，CPU 放下手头的活，跳进中断服务函数（ISR），干完再回来。快、省、不遗漏。' },
      { speaker: 'laozhou', text: 'ISR 三大纪律：要短、要快、不准在里面 delay。中断里磨洋工，整个系统都会心律不齐。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '按下即亮，零延迟！门铃比盯梢文明多了！' },
      { speaker: 'laozhou', text: '冷知识：你的电脑每秒处理成千上万次中断——键盘、网卡、定时器。操作系统的灵魂，就是一个巨大的中断分发器。概念代码：`当 p1 下降沿时 → 点亮 p0`，一行顶轮询一百行。' },
    ],
    palette: [
      // P1 修复：上拉出厂 1kΩ 不在 8~12kΩ 窗口内（与 sa-3 同一选型任务）
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 1000 } },
      { id: 'RP2', type: 'resistor', x: 0, y: 0, params: { resistance: 220 } },
      { id: 'KEY1', type: 'button', x: 0, y: 0 },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'U1', type: 'mcu', x: 320, y: 176, params: { pinVoltage: 3.3, current: 20 }, locked: true },
        { id: 'LED1', type: 'led', x: 544, y: 176, params: { vf: 2 }, locked: true },
        // 同 sa-1：地星点移到重心下方，避免多路地线沿左下对角走廊叠行
        { id: 'GND1', type: 'gnd', x: 400, y: 360, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 2 },
      { kind: 'component-placed', type: 'button', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'U1', port: 'p1' } },
      { kind: 'connected', a: { comp: 'KEY1', port: 'a' }, b: { comp: 'U1', port: 'p1' } },
      { kind: 'connected', a: { comp: 'KEY1', port: 'b' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'p0' }, b: { comp: 'RP2', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP2', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 8000, max: 12000 },
      { kind: 'node-voltage', node: { comp: 'U1', port: 'p1' }, min: 3.1, max: 3.4 },
      { kind: 'led-lit', comp: 'LED1' },
    ],
    stars: [
      { id: 'first-try', label: '一次接通', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '6 分钟内完成', check: 'time', value: 360 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['中断', '上拉电阻'],
    formula: { expr: 'I按下 = Vcc / R上拉', vars: 'Vcc 电源(V)、R上拉 上拉电阻(Ω)', note: '上拉 10kΩ 保证 p1 默认 3.3V；下降沿一到，硬件中断立刻点亮 p0 的 LED' },
    hints: [
      '这是 sa-1 与 sa-3 的合体：p0 带 LED（220Ω），p1 带按键上拉（10kΩ）。',
      '上拉让 p1 默认 3.3V；程序层面（概念代码）用「当 p1 下降沿时」触发 p0 点亮。',
      'RP1=10kΩ 上拉、RP2=220Ω 限流，连线 10 条见 briefing，并双击 U1，勾选 P0 输出高。',
    ],
    knowledge: {
      title: '中断与事件驱动思维',
      body: '轮询把 CPU 绑死在「反复确认」上：频率低了漏事件，频率高了烧功耗。中断让硬件站岗：引脚电平变化（上升沿/下降沿）瞬间，CPU 暂停主程序，跳转执行中断服务函数（ISR），完毕返回。收益是双重的——响应延迟从「一个轮询周期」降到微秒级，空闲时 CPU 可以进睡眠省电费。ISR 三大纪律：执行时间要短（微秒级，长活拆出来留给主循环）、不许调用阻塞函数（delay/串口打印都可能翻车）、与主程序共享的变量要加 volatile 防编译器优化误判。从按键到编码器、从串口收包到定时任务，事件驱动是嵌入式世界的操作系统级世界观——这一行概念代码 `当 p1 下降沿时 → 点亮 p0`，与 Linux 内核里的中断处理共享同一个灵魂。',
    },
    // 验算: 上拉未按时 p1≈3.3V ∈ [3.1,3.4] ✓（同 sa-3）；LED 支路 I=(3.3−2)/220=5.9mA，点亮 ✓
  },
  {
    id: 'sa-6',
    track: 'side-a',
    chapter: 1,
    index: 6,
    title: '无线第一课',
    subtitle: '给灯装上「云开关」',
    briefing:
      '支线 A 毕业关：让 ESP32 通过射频模块把「开灯」指令发出去——电路上是 p0 的 LED 指示 + p1 驱动射频模块 + 天线。LED 电流 4~9mA、天线阻抗 50Ω。概念代码只有一句：「收到开灯指令 → p0 输出高」。',
    intro: [
      { speaker: 'xiaohan', text: 'WiFi 听起来高大上，对电路来说就是：串口发一句话，模块帮你飞出去！第 6 章学的载波和匹配，在这里全用上了！' },
      { speaker: 'laozhou', text: '无线功能的边界要清楚：协议栈、加密、重连这些复杂事，模块和库替你扛了；但供电够不够（发射瞬间几百 mA）、天线匹不匹配，是你的责任。' },
      { speaker: 'laozhou', text: '从 GPIO 到无线，你只花了六关。但请记住：「能连上」和「连得稳」之间，隔着电磁兼容、供电设计和无数次实测。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '灯随云动！支线 A 毕业！你的板子正式「活」了——会看（ADC）、会听（中断）、会说（无线）！' },
      { speaker: 'laozhou', text: '冷知识：你刚才 conceptually 完成的，正是千亿物联网设备的最小形态。智能家居、农田监测、共享单车锁——剥开外壳，都是「MCU + 射频 + 传感器 + 电源」这套骨架。' },
    ],
    palette: [
      // P1 修复：出厂 1kΩ/75Ω 都不达标；220Ω（限流）与 50Ω（匹配）分别要算/要对齐
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 1000 } },
      { id: 'ANT1', type: 'antenna', x: 0, y: 0, params: { impedance: 75 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176, params: { voltage: 3.3 }, locked: true },
        { id: 'U1', type: 'mcu', x: 272, y: 176, params: { pinVoltage: 3.3, current: 20 }, locked: true },
        { id: 'MOD1', type: 'module', x: 480, y: 96, params: { band: '2.4G' }, locked: true },
        { id: 'LED1', type: 'led', x: 480, y: 256, params: { vf: 2 }, locked: true },
        // 地星点放在 U1 与右侧射频簇之间的鞍部：四路地线扇形汇入不共走廊
        { id: 'GND1', type: 'gnd', x: 256, y: 432, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'component-placed', type: 'antenna', count: 1 },
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'U1', port: 'vcc' } },
      { kind: 'connected', a: { comp: 'U1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'BT1', port: 'neg' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'U1', port: 'p1' }, b: { comp: 'MOD1', port: 'in' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'vcc' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'gnd' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'connected', a: { comp: 'MOD1', port: 'out' }, b: { comp: 'ANT1', port: 'a' } },
      { kind: 'connected', a: { comp: 'U1', port: 'p0' }, b: { comp: 'RP1', port: 'a' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'GND1', port: 'gnd' } },
      { kind: 'param', comp: 'ANT1', param: 'impedance', min: 45, max: 55 },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 4, max: 9 },
    ],
    stars: [
      { id: 'first-try', label: '一次接通', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '7 分钟内完成', check: 'time', value: 420 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['物联网节点', '天线匹配'],
    formula: { expr: 'λ = c / f，Γ = (ZL − Z0) / (ZL + Z0)', vars: 'c 光速 3×10⁸ m/s、f 频率(Hz)、Z0 系统阻抗 50Ω', note: '2.4GHz → λ ≈ 12.5cm；天线 50Ω 匹配，LED 限流 220Ω（I ≈ 5.9mA）' },
    hints: [
      '三条链：供电（3.3V 同时喂 U1 和 MOD1）、射频（p1→MOD1→天线）、指示（p0→电阻→LED）。',
      '天线阻抗用主线第 6 章的答案：50Ω。LED 限流：3.3V 体系 220Ω。',
      'RP1=220Ω、ANT1=50Ω，按 briefing 连 11 条线，并双击 U1，勾选 P0、P1 输出高。',
    ],
    knowledge: {
      title: '物联网节点的最小系统',
      body: '把支线 A 六关叠起来，就是物联网节点的标准形态：GPIO 输出执行（灯、继电器）、PWM 调节能量、上拉输入感知按键、ADC 读取模拟世界、中断保证实时响应、无线模块连接云端。工程落地的三个跨学科约束：供电——WiFi 发射脉冲电流可达 300~500mA，电源设计按峰值而非平均值；天线——匹配 50Ω、净空区守规矩（c6-3 的铁律）；固件——连接会断、服务器会慢，健壮的重连与超时设计比功能本身更费代码。理解了这套骨架，智能家居、工业遥测、农业传感在你眼里不再是黑盒：它们只是同一个电路，穿了一万种外壳。',
    },
    // 验算: LED 支路 I=(3.3−2)/220=5.9mA ∈ [4,9] ✓；ANT 50Ω ∈ [45,55] ✓；3.3V 同时为 U1/MOD1 供电 ✓
  },
];
