// 第 1 章 · 电是什么（4 关）—— 手把手教学，preset 多、目标单一
// 单位约定：电压 V，电流 mA。LED Vf=2V。
import type { LevelDef } from '@/engine/types';

export const C1_LEVELS: LevelDef[] = [
  {
    id: 'c1-1',
    track: 'main',
    chapter: 1,
    index: 1,
    title: '接通！第一条回路',
    subtitle: '电流从哪儿来，到哪儿去',
    briefing:
      '欢迎来到回路工坊！工作台上已经摆好了一节 5V 电池和一颗 1kΩ 电阻。用导线把电池正极、电阻、电池负极连成一条闭合回路，让电流跑起来。目标：回路导通，且流过电阻的电流落在 4~6mA。',
    intro: [
      { speaker: 'laozhou', text: '新来的？先别急着碰烙铁。看见桌上那节电池没有——先想想，电流从哪儿来，到哪儿去？' },
      { speaker: 'xiaohan', text: '（烙铁头兴奋地发红）用导线把电池正极 → 电阻 → 电池负极连起来就行！电流喜欢绕圈圈，断一点它都罢工！' },
      { speaker: 'laozhou', text: '记住：电流只在闭合回路里流动。这是电路的第一条铁律，往后三十年都用得上。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '通了通了！万用表上跳出 5mA 的那一刻，你就是半个电工了！' },
      { speaker: 'laozhou', text: '5V 推着 1kΩ，正好 5mA。冷知识：人体能感知的电流大约 1mA，你这第一条回路已经超了五倍——当然，5V 电池可电不着人。' },
    ],
    palette: [],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 160, params: { voltage: 5 }, locked: true },
        { id: 'R1', type: 'resistor', x: 320, y: 96, params: { resistance: 1000 }, locked: true },
        { id: 'AM1', type: 'ammeter', x: 320, y: 224, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R1', port: 'a' } },
      { kind: 'connected', a: { comp: 'R1', port: 'b' }, b: { comp: 'AM1', port: 'a' } },
      { kind: 'connected', a: { comp: 'AM1', port: 'b' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'branch-current', comp: 'R1', min: 4, max: 6 },
    ],
    stars: [
      { id: 'first-try', label: '不重置一次点亮', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '3 分钟内完成', check: 'time', value: 180 },
    ],
    hints: [
      '电流需要一个完整的圆圈才能流动：从电池正极出发，最终回到电池负极。',
      '把 BT1 的正极连到 R1 的 a 端，R1 的 b 端连到电流表，电流表再连回 BT1 负极。',
      '依次连三条线：BT1.pos→R1.a，R1.b→AM1.a，AM1.b→BT1.neg，然后点 ▶ 运行。',
    ],
    knowledge: {
      title: '回路：电流的环形跑道',
      body: '电流的本质是电荷的定向移动，而电荷不会凭空消失——它必须从电源正极出发，经过负载做功，再回到电源负极，形成闭合回路。任何一处断开，整条路的电流立刻归零，这就是「断路」；反之，如果导线绕过负载直接把正负极短接，电流会失去约束急剧增大，这就是危险的「短路」。判断任何电路的第一步永远是老周那句话：先找到电流的完整路径。电压是推力，回路是跑道，电阻是跑道上的摩擦——三者齐了，电路才「活」。',
    },
    // 验算: I = 5V / 1kΩ = 5mA ∈ [4,6]mA ✓（恰好居中，裕量 ±20%）
  },
  {
    id: 'c1-2',
    track: 'main',
    chapter: 1,
    index: 2,
    title: '电压：电流的推手',
    subtitle: '学会用电压表看电路',
    briefing:
      '一节 9V 电池摆在台上。老周想让你弄明白「电压」到底是什么：把电压表正确并联到电池两端，读出它的电压。注意电压表的正负表笔别接反了。',
    intro: [
      { speaker: 'laozhou', text: '电流是水流，那电压是什么？是水压。没有水压，水管再粗也没水流动。' },
      { speaker: 'xiaohan', text: '电压表要「并联」在被测元件两端——红表笔接高电位，黑表笔接低电位！接反了指针会打摆子！' },
      { speaker: 'laozhou', text: '电压表的内阻极大，串进回路等于断路。记住：电压表并着接，电流表串着接，接错了老师傅要骂人的。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '读数 9V！分毫不差！' },
      { speaker: 'laozhou', text: '冷知识：标称 9V 的叠层电池，新的能到 9.6V，快没电时跌到 7V 以下。所以数据手册上的「标称值」永远要配着「范围」看。' },
    ],
    palette: [
      { id: 'VM1', type: 'voltmeter', x: 0, y: 0 },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 160, y: 160, params: { voltage: 9 }, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'voltmeter', count: 1 },
      { kind: 'connected', a: { comp: 'VM1', port: 'pos' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'VM1', port: 'neg' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'node-voltage', node: { comp: 'BT1', port: 'pos' }, min: 8.5, max: 9.5 },
    ],
    stars: [
      { id: 'first-try', label: '表笔一次接对', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '3 分钟内完成', check: 'time', value: 180 },
    ],
    hints: [
      '电压是「两点之间」的差值，所以电压表必须跨接在元件两端——这叫并联。',
      '把 VM1 的 pos（红表笔）接到电池正极，neg（黑表笔）接到电池负极。',
      '连线：VM1.pos→BT1.pos，VM1.neg→BT1.neg，运行后读数应为 9V。',
    ],
    knowledge: {
      title: '电压与测量：并联的艺术',
      body: '电压是两点之间的电位差，单位伏特（V）。它描述的是「电荷从这一点走到那一点能获得多少能量」。正因为它是一个「差值」，测量时必须把电压表并联在被测两点之间——理想电压表内阻无穷大，几乎不分流，所以不会影响被测电路。工程直觉：1.5V 是一节干电池，3.7V 是锂电芯，5V 是 USB，市电 220V 指的是有效值。养成随手确认「参考地」的习惯：说某点电压多少伏，永远要追问一句——相对于谁？',
    },
    // 验算: 理想电池端电压 = 标称 9V ∈ [8.5,9.5]V ✓（电压表内阻视为无穷大，不分流）
  },
  {
    id: 'c1-3',
    track: 'main',
    chapter: 1,
    index: 3,
    title: '欧姆定律：电路的万有引力',
    subtitle: 'V = I × R',
    briefing:
      '工坊接了个小测试：用这节 5V 电池搭一条回路，让电流表读数稳定在 9~11mA。元件盒里有几颗不同阻值的电阻——选哪颗，你自己算。提示：I = V ÷ R。',
    intro: [
      { speaker: 'laozhou', text: '1827 年，一个叫欧姆的德国中学老师写下了电学里最重要的一个式子：I = V / R。电压推，电阻拦，出来的就是电流。' },
      { speaker: 'xiaohan', text: '5V 想要 10mA？快算快算！R = V ÷ I = 5 ÷ 0.01 = 500Ω！' },
      { speaker: 'laozhou', text: '别小看这个式子。往后你调的每一分压、算的每颗限流电阻、查的每一次过流，全是它。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '读数命中！欧姆定律，百发百中！' },
      { speaker: 'laozhou', text: '冷知识：欧姆当年发表这个定律时被学界嘲笑「纯属空想」，一气之下辞了职。十几年后人们才承认他是对的——现在没人敢不用它。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 1000 } },
    ],
    preset: {
      components: [
        { id: 'BT1', type: 'battery', x: 96, y: 176, params: { voltage: 5 }, locked: true },
        { id: 'AM1', type: 'ammeter', x: 352, y: 176, locked: true },
      ],
      wires: [],
    },
    goals: [
      { kind: 'component-placed', type: 'resistor', count: 1 },
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'AM1', port: 'a' } },
      { kind: 'connected', a: { comp: 'AM1', port: 'b' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 480, max: 520 },
      { kind: 'branch-current', comp: 'AM1', min: 9, max: 11 },
    ],
    stars: [
      { id: 'first-try', label: '一次算对阻值', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    hints: [
      '电流目标约 10mA，电源是 5V。用 I = V / R 反推 R = V / I。',
      'R = 5V ÷ 10mA = 500Ω。把 RP1 的阻值改成 500Ω 附近，再串进回路。',
      '把 RP1 阻值设为 500Ω，连线 BT1.pos→RP1.a→RP1.b→AM1.a→AM1.b→BT1.neg，运行读数约 10mA。',
    ],
    knowledge: {
      title: '欧姆定律：I = V / R',
      body: '欧姆定律是电路分析的基石：流过导体的电流 I 等于两端电压 V 除以电阻 R。三个量知二求一，是工程师每天都在做的心算。它的物理图景很直白：电压是推力，电阻是阻碍，推力越大电流越大，阻碍越大电流越小。配合功率公式 P = V × I = I² × R，你还能算出元件会不会「发烧」——选电阻时除了阻值还要看额定功率，常用的 1/4W 电阻在 10mA、500Ω 下功耗 50mW，绰绰有余。注意欧姆定律只适用于线性元件；LED、二极管这类非线性元件要用另一条思路（伏安曲线）处理，这正是下一关的故事。',
    },
    // 验算: 目标 I≈10mA，R=V/I=5/0.01=500Ω；R∈[480,520] → I∈[5/520, 5/480]=[9.6, 10.4]mA ⊂ [9,11]mA ✓
  },
  {
    id: 'c1-4',
    track: 'main',
    chapter: 1,
    index: 4,
    title: '点亮你的第一颗 LED',
    subtitle: '限流电阻：LED 的保命符',
    briefing:
      '章底大考：点亮一颗 LED，而且不许烧掉它！LED 导通压降约 2V，安全电流 10~18mA。5V 电池、LED 都已就位，给它配一颗限流电阻，让电流落在安全区间。',
    intro: [
      { speaker: 'laozhou', text: 'LED 是个脾气古怪的家伙：电压够了就拼命吃电流，不设上限——吃到 20mA 以上，「啪」，一缕青烟。' },
      { speaker: 'xiaohan', text: '所以一定要串限流电阻！5V 减 LED 的 2V，剩下 3V 全压在电阻上！' },
      { speaker: 'laozhou', text: '先想想电流从哪儿来，到哪儿去：正极 → 电阻 → LED 正极（长脚）→ LED 负极 → 回负极。顺序不能乱。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '亮了亮了！！！（烙铁头红到发烫）这是你亲手点亮的第一颗灯！' },
      { speaker: 'laozhou', text: '不错。冷知识：LED 每按一次错误的接法烧毁，华强北就多一个伤心的故事。记住今天算的这颗电阻——以后每块板子上你都要算它几百次。' },
    ],
    palette: [
      { id: 'RP1', type: 'resistor', x: 0, y: 0, params: { resistance: 1000 } },
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
      { kind: 'connected', a: { comp: 'RP1', port: 'a' }, b: { comp: 'BT1', port: 'pos' } },
      { kind: 'connected', a: { comp: 'RP1', port: 'b' }, b: { comp: 'LED1', port: 'a' } },
      { kind: 'connected', a: { comp: 'LED1', port: 'k' }, b: { comp: 'BT1', port: 'neg' } },
      { kind: 'led-lit', comp: 'LED1' },
      { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 },
    ],
    stars: [
      { id: 'first-try', label: '一次点亮不烧灯', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '5 分钟内完成', check: 'time', value: 300 },
    ],
    hints: [
      'LED 分正负极：a 是阳极（长脚，接高电位），k 是阴极。电流只能从 a 流向 k。',
      '电阻上的压降 = 5V − 2V = 3V。想要 10~18mA，用 R = 3V ÷ I 算一个中间值，比如 13mA。',
      'R ≈ 3V ÷ 13.6mA ≈ 220Ω。把 RP1 设为 220Ω，按 BT1→RP1→LED1(a进k出)→BT1 连成回路。',
    ],
    knowledge: {
      title: 'LED 与限流电阻的算法',
      body: 'LED（发光二极管）是非线性元件：正向导通后压降基本固定（红绿约 2V，蓝白约 3V），但电流随电压指数增长——没有限流措施，它会在几毫秒内烧毁。限流电阻的标准算法：R = (V电源 − Vf) ÷ I目标。本关 (5−2)÷0.0136 ≈ 220Ω，这也是 E24 系列里最常见的标准值。工程上还要留两重裕量：一是电源波动（USB 实际 4.75~5.25V），二是温度升高会让 Vf 略降、电流略升。所以目标电流取额定值的 60~70% 最稳妥——额定 20mA 的 LED，日常按 10~15mA 用，亮度足够且寿命翻倍。',
    },
    // 验算: R=220Ω 时 I=(5−2)/220=13.6mA ∈ [10,18]mA ✓；允许区间 R∈[167,300]Ω 均安全
  },
];
