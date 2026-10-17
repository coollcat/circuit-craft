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
      '欢迎来到回路工坊！工作台上已经摆好了一节 5V 电池和一颗 1kΩ 电阻（电流的「减速带」）。用导线把电池正极、电阻、电池负极连成一圈，让电流跑起来。目标：回路接通，流过电阻的电流在 4~6mA（毫安，电流大小的单位）之间。',
    intro: [
      { speaker: 'laozhou', text: '新来的？先别急着碰烙铁。看见桌上那节电池没有——先想想，电流从哪儿来，到哪儿去？' },
      { speaker: 'xiaohan', text: '（烙铁头兴奋地发红）用导线把电池正极 → 电阻 → 电池负极连起来就行！电流像一群爱跑圈的小蚂蚁，路断了一丁点，它们就全体停下罢工！' },
      { speaker: 'laozhou', text: '记住：电流只在闭合回路（一圈完整的路）里流动，必须能跑回起点。这是电路的第一条铁律，往后三十年都用得上。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '通了通了！电流表上跳出 5mA 的那一刻，你就是半个电工了！' },
      { speaker: 'laozhou', text: '5V 推着 1kΩ，正好 5mA。把电流想成水流：电池是水塔，导线是水管，水能跑一整圈，水车（电阻）才会转。冷知识：5V 电池可电不着人，放心摸。' },
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
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['回路', '欧姆定律'],
    formula: { expr: 'I = V / R', vars: 'I 电流(A)、V 电压(V)、R 电阻(Ω)', note: '5V ÷ 1kΩ = 5mA；串联回路里电流处处相等，路断则全停' },
    hints: [
      '电流需要一个完整的圆圈才能流动：从电池正极出发，最终回到电池负极。就像小火车需要一圈不断开的铁轨。',
      '把 BT1 的正极连到 R1 的 a 端，R1 的 b 端连到电流表，电流表再连回 BT1 负极。',
      '依次连三条线：BT1.pos→R1.a，R1.b→AM1.a，AM1.b→BT1.neg，然后点 ▶ 运行。',
    ],
    knowledge: {
      title: '回路：电流的环形跑道',
      body: '把电流想成一群在跑道上的小运动员：它们从电池正极出发，沿着导线跑，推动一路上的元件干活，最后必须跑回电池负极——这一整圈就叫「回路」。跑道断了一个口子，所有运动员立刻停下，这叫「断路」；如果有人抄近道，用导线把电池正负极直接连起来，运动员们全挤进近道狂奔，电池会被瞬间榨干甚至发烫，这叫「短路」，是电路里最大的安全事故。所以拿到任何电路，第一步都是老周那句话：先找到电流的完整跑道。电压是推力，回路是跑道，电阻是跑道上的减速带——三者齐了，电路才「活」。',
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
      '一节 9V 电池摆在台上。老周想让你弄明白「电压」（电流的推力，就像水管里的水压）到底是什么：把电压表正确地搭在电池两端，读出它的电压。注意电压表的红黑表笔别接反了。',
    intro: [
      { speaker: 'laozhou', text: '电流是水流，那电压是什么？是水压。水塔越高水压越足；电池标 9V，它的「推力」就比 5V 的大。' },
      { speaker: 'xiaohan', text: '电压表要「并联」（两头一左一右搭在被测的东西两端，像桥一样跨上去）——红表笔接正极，黑表笔接负极！接反了读数会变负数哦！' },
      { speaker: 'laozhou', text: '电压表自己几乎不吃电流，所以搭在旁边看就行。记住口诀：电压表并着接，电流表串着接，接错了老师傅要骂人的。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '读数 9V！分毫不差！' },
      { speaker: 'laozhou', text: '冷知识：标称 9V 的电池，新的能到 9.6V，快没电时会跌破 7V——就像水壶里的水会慢慢变少。所以「标称值」只是大概，实际量一量才作数。' },
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
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['电压测量', '并联'],
    formula: { expr: 'U = V₊ − V₋', vars: 'V₊、V₋ 为红/黑表笔所接两点的电位(V)', note: '电压是两点之差：表笔并联跨接，电压表内阻极大、几乎不分流' },
    hints: [
      '电压是「两点之间」的差值，所以电压表必须一左一右跨搭在元件两端——这叫「并联」。',
      '把 VM1 的 pos（红表笔）接到电池正极，neg（黑表笔）接到电池负极。',
      '连线：VM1.pos→BT1.pos，VM1.neg→BT1.neg，运行后读数应为 9V。',
    ],
    knowledge: {
      title: '电压与测量：并联的艺术',
      body: '电压是两点之间的「推力差」，单位是伏特（V）。用水来打比方：电压就是水压，水压差越大，水流被推着跑的劲儿越足。正因为电压是个「差值」，量它的时候要把电压表的两支表笔分别搭在两点上——这叫并联。电压表自己几乎不吃电流（内阻特别大），所以搭上去不会影响电路。记几个常见电压就有直觉了：1.5V 是一节干电池，3.7V 是手机电池，5V 是 USB 口。还有个小习惯：说「这点是 5V」时，永远要问一句——是比谁高 5V？大家公认的那个「零点」，就是下一章要认识的地（GND）。',
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
      '工坊接了个小测试：用这节 5V 电池搭一条回路，让电流表读数稳定在 9~11mA。料盒里那颗电阻出厂是 1kΩ，是随手放的——先别急着用：常见标准值有 470Ω / 510Ω / 680Ω 三档（阻值就是「减速」的厉害程度，越大电流越小），先算、再挑一档、把 1kΩ 改成你算出的那一档。提示：I = V ÷ R。',
    intro: [
      { speaker: 'laozhou', text: '1827 年，一个叫欧姆的德国中学老师写下了电学里最重要的一个式子：I = V / R。电压使劲推，电阻使劲拦，最后跑多快，一除就知道。' },
      { speaker: 'xiaohan', text: '像捏水管！水压（电压）不变，水管捏得越细（电阻越大），水流（电流）就越小！5V 想要 10mA？快算快算！R = V ÷ I = 5 ÷ 0.01 = 500Ω！' },
      { speaker: 'laozhou', text: '别小看这个式子。往后你调的每一分压、算的每颗限流电阻、查的每一次过流，全是它。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '读数命中！欧姆定律，百发百中！' },
      { speaker: 'laozhou', text: '冷知识：欧姆当年发表这个定律时被嘲笑「纯属空想」，气得辞了职。十几年后人们才承认他是对的——现在全世界每天都在用它。' },
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
      { kind: 'param', comp: 'RP1', param: 'resistance', min: 460, max: 540 },
      { kind: 'branch-current', comp: 'AM1', min: 9, max: 11 },
    ],
    stars: [
      { id: 'first-try', label: '一次算对阻值', check: 'first-try' },
      { id: 'no-hint', label: '不使用任何提示', check: 'no-hint' },
      { id: 'time', label: '4 分钟内完成', check: 'time', value: 240 },
    ],
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['欧姆定律', 'E24 标准值'],
    formula: { expr: 'R = V / I', vars: 'V 电阻两端电压(V)、I 目标电流(A)', note: '5V ÷ 10mA = 500Ω；E24 标准值 470Ω 与 510Ω 都落在 9~11mA 窗口' },
    hints: [
      '电流目标约 10mA，电源是 5V。用 I = V / R 反推 R = V / I。',
      'R = 5V ÷ 10mA = 500Ω。常见标准值里的 470Ω（10.6mA）和 510Ω（9.8mA）都落在窗口内；680Ω 只有 8.9mA，超窗口，不行。',
      '把 RP1 调成你选中的那一档（470Ω 或 510Ω），连线 BT1.pos→RP1.a→RP1.b→AM1.a→AM1.b→BT1.neg，运行读数约 10mA。',
    ],
    knowledge: {
      title: '欧姆定律：I = V / R',
      body: '欧姆定律是电路里最有用的公式：电流 I = 电压 V ÷ 电阻 R。还是水管的比方：电压是水压，电阻是水管的细脖子，水流大小 = 水压 ÷ 阻碍。推力越大水越猛，脖子越细水越小——三个量知道任意两个，就能算出第三个。再送你一个「发热公式」：P = V × I，电流流过电阻会发热，功率越大越烫，所以选电阻除了看阻值还要看它扛不扛得住热（额定功率）。小提醒：欧姆定律只管电阻这类「老实」元件；LED、二极管这类「脾气怪」的元件要用另一套办法，这正是下一关的故事。',
    },
    // 验算: 目标 I≈10mA，R=V/I=5/0.01=500Ω；R∈[460,540] → I∈[5/540, 5/460]=[9.3, 10.9]mA ⊂ [9,11]mA ✓
    // P1 修复（假选择）：出厂 1kΩ ≠ 答案；briefing 给出 470/510/680 三档，只有前两档满足窗口，玩家必须先算再选
  },
  {
    id: 'c1-4',
    track: 'main',
    chapter: 1,
    index: 4,
    title: '点亮你的第一颗 LED',
    subtitle: '限流电阻：LED 的保命符',
    briefing:
      '章底大考：点亮一颗 LED（会发光的小灯珠），而且不许烧掉它！LED 自己要吃掉约 2V 电压，安全电流是 10~18mA。5V 电池、LED 都已就位，给它配一颗「限流电阻」（专门管住电流别太大的减速带），让电流落在安全区间。',
    intro: [
      { speaker: 'laozhou', text: 'LED 是个贪吃的家伙：电压一够就拼命吃电流，一点不知道节制——吃到 20mA 以上，「啪」，一缕青烟，小灯报废。' },
      { speaker: 'xiaohan', text: '所以一定要串一颗限流电阻帮它「管住嘴」！电池 5V，LED 自己占掉 2V，剩下 3V 全交给电阻去消化！' },
      { speaker: 'laozhou', text: '先想想电流从哪儿来，到哪儿去：正极 → 电阻 → LED 长脚（正极）→ LED 短脚（负极）→ 回电池负极。顺序不能乱。' },
    ],
    outro: [
      { speaker: 'xiaohan', text: '亮了亮了！！！（烙铁头红到发烫）这是你亲手点亮的第一颗灯！' },
      { speaker: 'laozhou', text: '不错。记住今天这颗电阻的算法——以后每块板子上你都要算它几百次。顺便说：LED 的长脚永远是正极，就像长颈鹿的脖子，「长」的就是冒头的那个。' },
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
    // 教学元数据（W5）：概念标签 + 本关主导公式
    concept: ['限流电阻', 'LED 极性'],
    formula: { expr: 'R = (Vcc − Vf) / If', vars: 'Vcc 电源(V)、Vf LED 正向压降(V)、If 目标电流(A)', note: '(5 − 2) ÷ 13.6mA ≈ 220Ω；电流只能从阳极 a 流向阴极 k' },
    hints: [
      'LED 分正负极：a 是阳极（长脚，接电池正极方向），k 是阴极（短脚）。电流只能从 a 流向 k，接反了它不亮。',
      '电阻要消化 5V − 2V = 3V。想要 10~18mA，用 R = 3V ÷ I 挑个中间值算，比如 13mA。',
      'R ≈ 3V ÷ 13.6mA ≈ 220Ω。把 RP1 设为 220Ω，按 BT1→RP1→LED1(a进k出)→BT1 连成回路。',
    ],
    knowledge: {
      title: 'LED 与限流电阻的算法',
      body: 'LED（发光二极管，就是会发光的小灯珠）脾气很急：只要电压够它的「开机门槛」（红灯约 2V，蓝白灯约 3V），它就拼命吃电流，多给一点都不行——没有电阻管着，几毫秒内就会烧掉。所以每颗 LED 都要配一颗「限流电阻」，算法就一步：电阻要消化的电压 ÷ 你想要的电流，R = (V电源 − Vf) ÷ I目标。本关 (5−2) ÷ 0.0136 ≈ 220Ω。老师傅还有两个小心得：一是别顶着上限用，额定 20mA 的灯按 10~15mA 用，又亮又长寿；二是电源电压会变（比如电池越用越虚），算的时候留点余地。',
    },
    // 验算: R=220Ω 时 I=(5−2)/220=13.6mA ∈ [10,18]mA ✓；允许区间 R∈[167,300]Ω 均安全
  },
];
