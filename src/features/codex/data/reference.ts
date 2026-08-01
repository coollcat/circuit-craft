// 公式速查 / 术语表 / 老手角落 数据
export interface FormulaCard {
  id: string;
  name: string;
  formula: string;
  vars: string;
  /** 30 字内人话注解 */
  note: string;
  scene: string;
  chapter?: number;
}

export const FORMULAS: FormulaCard[] = [
  { id: 'ohm', name: '欧姆定律', formula: 'V = I × R', vars: 'V 电压(V) · I 电流(A) · R 电阻(Ω)', note: '电压、电流、电阻知道俩就能算第三个。', scene: '一切电路分析的起点', chapter: 1 },
  { id: 'power', name: '电功率', formula: 'P = V × I = I² × R', vars: 'P 功率(W)', note: '电阻吃掉多少电、发多少热，全看它。', scene: '校核元件会不会烧', chapter: 1 },
  { id: 'divider', name: '电阻分压', formula: 'Vout = Vin × R2/(R1+R2)', vars: 'R1 上臂 · R2 下臂(输出取自 R2)', note: '两颗电阻按比例把电压切开，采样必备。', scene: 'ADC 采样 / 偏置', chapter: 3 },
  { id: 'tau', name: 'RC 时间常数', formula: 'τ = R × C', vars: 'τ 秒(s) · R(Ω) · C(F)', note: '一个 τ 充到 63.2%，五个 τ 视为充满。', scene: '延时 / 复位 / 滤波', chapter: 3 },
  { id: 'rcfc', name: 'RC 截止频率', formula: 'fc = 1 / (2πRC)', vars: 'fc(Hz) 衰减 -3dB 点', note: '高于 fc 的信号开始被衰减，每十倍频 -20dB。', scene: '低通/高通滤波设计', chapter: 3 },
  { id: 'capenergy', name: '电容储能', formula: 'E = ½ × C × V²', vars: 'E 能量(J)', note: '电容存的能量随电压平方涨，掉电维持靠它。', scene: '储能 / 掉电保护', chapter: 2 },
  { id: 'lc', name: 'LC 谐振频率', formula: 'f = 1 / (2π√(LC))', vars: 'L(H) · C(F)', note: '电感电容凑一起会「唱歌」，频率由它俩定。', scene: '选频 / 晶振 / 振荡', chapter: 6 },
  { id: 'opinv', name: '反相放大增益', formula: 'G = −Rf / Rin', vars: '输出与输入反相', note: '增益只看两颗电阻的比，负号表示反相。', scene: '信号放大', chapter: 5 },
  { id: 'opnon', name: '同相放大增益', formula: 'G = 1 + Rf / Rg', vars: 'Rg 接地的反馈下臂', note: '增益最小是 1，相位不翻转。', scene: '阻抗变换 / 放大', chapter: 5 },
  { id: 'ldo', name: 'LDO 功耗', formula: 'P = (Vin − Vout) × I', vars: '压差 × 电流 = 发热', note: 'LDO 把压差全烧成热量，压差大就烫手。', scene: '电源选型 / 散热', chapter: 7 },
  { id: 'adc', name: 'ADC 分辨率', formula: 'LSB = Vref / 2^N', vars: 'N 位数(bit) · Vref 参考电压', note: '12 位 ADC 配 3.3V，一格约 0.8mV。', scene: '模拟采样精度估算', chapter: 5 },
  { id: 'trace', name: '走线载流(IPC-2221简化)', formula: 'I = k × ΔT^0.44 × A^0.725', vars: '外层 k=0.048 · A 截面积(mil²)', note: '1oz 铜 10mil 线宽外层约走 1A（温升 10°C）。', scene: '电源走线宽度估算', chapter: 4 },
  { id: 'wave', name: '波长与频率', formula: 'λ = c / f', vars: 'c≈3×10⁸ m/s', note: '2.4GHz 波长约 125mm，天线尺寸从这来。', scene: '天线长度估算', chapter: 6 },
];

export interface GlossaryTerm {
  term: string;
  /** 分组键：字母或拼音首字母 */
  group: string;
  def: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Gerber', group: 'G', def: 'PCB 制造的标准光绘文件格式，每层铜/阻焊/丝印一个文件，发给板厂就靠它。' },
  { term: 'DRC', group: 'D', def: '设计规则检查（Design Rule Check），自动查线宽、间距、孔径有没有违反板厂工艺。' },
  { term: 'BOM', group: 'B', def: '物料清单（Bill of Materials），列出每个位号用什么型号、数量与封装。' },
  { term: 'LDO', group: 'L', def: '低压差线性稳压器，把高电压降成稳定低电压，简单干净但压差变成热。' },
  { term: 'DC-DC', group: 'D', def: '开关式电源变换器，效率高（>90%）但有纹波，大压差大电流场合首选。' },
  { term: '去耦', group: 'Q', def: '在芯片电源脚就近放电容，本地供给瞬态电流、滤掉电源噪声。' },
  { term: '铺铜', group: 'P', def: '把空闲区域铺满接地的铜皮，降低地阻抗、帮助散热与屏蔽。' },
  { term: '过孔', group: 'G', def: '连接不同铜层的金属化小孔（Via），换层走线的通道。' },
  { term: '丝印', group: 'S', def: '印在板面的白色文字层（Silkscreen），标注位号、极性与版本。' },
  { term: '阻焊', group: 'Z', def: '覆盖铜箔的绿色（或其他色）油墨层，防氧化、防焊接桥连。' },
  { term: '焊盘', group: 'H', def: '元件焊接用的裸露铜区（Pad），贴片为方形、插件为环孔。' },
  { term: '上拉', group: 'S', def: '用电阻把信号线默认拉到高电平，防止输入浮空乱跳。' },
  { term: '下拉', group: 'X', def: '用电阻把信号线默认拉到低电平，与上拉互为镜像。' },
  { term: '开漏', group: 'K', def: '输出只能拉低或放手（Open-Drain），需外接上拉，可实现「线与」。' },
  { term: '推挽', group: 'T', def: '输出既能主动拉高也能主动拉低，驱动能力强，最常见的 IO 模式。' },
  { term: 'PWM', group: 'P', def: '脉宽调制，用占空比的平均值模拟电压大小，调光调速全靠它。' },
  { term: '占空比', group: 'Z', def: 'PWM 高电平时间占整个周期的比例，0%~100%。' },
  { term: 'ADC', group: 'A', def: '模数转换器，把连续电压量化成数字量，位数越高越精细。' },
  { term: 'DAC', group: 'D', def: '数模转换器，把数字量还原成模拟电压。' },
  { term: '纹波', group: 'W', def: '电源输出上叠加的周期性波动，开关电源尤其明显，用示波器看。' },
  { term: 'ESR', group: 'E', def: '等效串联电阻，电容/电池内部的寄生电阻，影响滤波与发热。' },
  { term: 'EMC', group: 'E', def: '电磁兼容：你的板子不干扰别人，也不被别人干扰。' },
  { term: 'EMI', group: 'E', def: '电磁干扰，板子向外辐射或传导的噪声，认证测试的大敌。' },
  { term: 'SI', group: 'S', def: '信号完整性（Signal Integrity），高速信号在走线上的波形保真问题。' },
  { term: '回流路径', group: 'H', def: '信号电流返回源头的路径，贴着信号线下方的地平面走。' },
  { term: '特性阻抗', group: 'T', def: '传输线对高频信号呈现的阻抗，射频/高速线要按 50Ω 等控制。' },
  { term: '阻抗匹配', group: 'Z', def: '让源、传输线、负载阻抗一致，能量才不反射。' },
  { term: '寄生参数', group: 'J', def: '元件藏着的非理想特性：引脚电感、极间电容等，高频下现形。' },
  { term: '降额', group: 'J', def: '故意不按额定值满用（如 50%），换取可靠性与寿命。' },
  { term: '热阻', group: 'R', def: '热量从芯片结到环境遇到的阻力（°C/W），散热设计核心参数。' },
  { term: '爬电距离', group: 'P', def: '沿绝缘表面两导体间的最短路径，安规对高低压间距有硬性要求。' },
  { term: '电气间隙', group: 'D', def: '两导体间穿过空气的最短距离，与爬电距离配套考核。' },
  { term: '泪滴', group: 'L', def: '走线与焊盘连接处的渐宽过渡，增强机械强度、防钻孔偏位断线。' },
  { term: '钢网', group: 'G', def: 'SMT 印锡膏用的激光切割薄钢片（Stencil），开窗对准焊盘。' },
  { term: '拼板', group: 'P', def: '多块小板排在一张大板上一起过贴片机，V 割或邮票孔分板。' },
  { term: '看门狗', group: 'K', def: '监控定时器：程序卡死没及时「喂狗」就强制复位 MCU。' },
  { term: 'TTL/CMOS 电平', group: 'T', def: '数字逻辑的高低电平标准：TTL 以 5V 为体系，CMOS 随供电电压变。' },
  { term: '亚稳态', group: 'Y', def: '触发器在时钟沿采样到变化中的信号，输出短暂悬在中间态。' },
];

export interface ProCornerArticle {
  id: string;
  title: string;
  subtitle: string;
  body: string[];
  takeaway: string;
}

export const PRO_CORNER: ProCornerArticle[] = [
  {
    id: 'decoupling',
    title: '去耦电容为什么要贴着芯片放？',
    subtitle: '20mm 的距离，足以毁掉一颗 100nF',
    body: [
      '芯片翻转 IO 的瞬间需要从电源脚抽一股脉冲电流，这股电流如果走「远方的电源 → 长走线 → 芯片」，走线上的寄生电感（每 10mm 约 5~10nH）会产生 V=L·dI/dt 的压降，电源脚电压瞬间塌陷。',
      '去耦电容的本质是「本地小水库」：它必须在物理上离用水点足够近，回路电感才小到可以忽略。距离 20mm 时，回路电感已经把 100nF 的勤恳工作废掉大半——这就是「贴脚放，越近越好，先过电容再到芯片引脚」的铁律。',
    ],
    takeaway: '电容→引脚→过孔到地，三段路径都要短；电容放背面时让过孔贴着引脚焊盘。',
  },
  {
    id: 'ground-split',
    title: '地平面分割：灵丹还是迷信？',
    subtitle: '模拟地/数字地分不分，老工程师也吵架',
    body: [
      '主张分割的一派：数字回流噪声大，切开地平面可以逼数字电流远离模拟区。反对的一派：分割制造了地平面缝隙，任何跨缝走线的回流都要绕远路，回路面积暴增，EMI 反而更糟。',
      '现代主流共识（尤其 4 层板）：保持地平面完整统一，用「分区布局」代替「分割地平面」——模拟器件集中放一边、数字放另一边，回流自然各走各的。只有极高精度 ADC（>16 位）或强干扰源（继电器/开关电源热回路）才考虑单点连接的分地。',
    ],
    takeaway: '先分区、后分割；任何信号线绝不跨过地平面的缝隙。',
  },
  {
    id: '0402-vs-0603',
    title: '0402 vs 0603：手工焊接难度真相',
    subtitle: '眼睛、手、镊子，总有一个先到极限',
    body: [
      '0603（1.6×0.8mm）是手工焊接的舒适区下限：尖头烙铁 + 0.5mm 焊锡丝，先固定一端再焊另一端，成功率很高。0402（1.0×0.5mm）开始考验硬功夫：需要显微镜或放大镜、细镊子精准对位，烙铁尖一抖就连锡。',
      '热风枪焊 0402 其实比烙铁更容易：锡膏点两个焊盘、元件放上去、热风一吹自对齐（表面张力效应）。0201 及以下基本告别手焊。打样建议：能选 0603 就别用 0402，除非空间真的不够。',
    ],
    takeaway: '学习板全用 0603/0805；量产交给贴片机再考虑 0402。',
  },
  {
    id: 'tvs',
    title: 'TVS：电路的「安全气囊」怎么选',
    subtitle: 'ESD 与浪涌来临时的最后防线',
    body: [
      'TVS（瞬态抑制二极管）平时高阻隐身，电压超过击穿值时在皮秒级导通，把静电或浪涌能量钳到安全电平。选型三看：①反向工作电压 VRWM ≥ 线路正常工作电压（5V 线选 VRWM 5V）；②钳位电压 VC < 被保护芯片的绝对最大额定值；③峰值脉冲功率/电流够扛 IEC 61000-4-2 的 8kV 接触放电。',
      '布局同样关键：TVS 必须放在干扰进入的第一站（接口处），泄流路径短而直接到地。USB、按键、外接传感器线都值得一颗 ESD 阵列（如 SRV05-4），几分钱换整块板的生存率。',
    ],
    takeaway: 'TVS 贴接口放，VRWM 贴着工作电压选，VC 对着芯片极限校核。',
  },
  {
    id: 'xtal-load',
    title: '晶振负载电容怎么算？',
    subtitle: '两颗电容背后的公式与经验',
    body: [
      '晶振数据手册给的负载电容 CL（如 12pF）是整个振荡回路「看到」的总电容。外部两颗匹配电容 C1、C2（通常相等）与 PCB 寄生电容 Cstray 串联后满足：CL = (C1×C2)/(C1+C2) + Cstray。',
      '当 C1=C2=C 时简化为 C = 2×(CL − Cstray)。Cstray 取经验值 3~5pF：CL=12pF 时 C≈2×(12−4)=16pF，就近取 15pF 或 18pF。负载不匹配不会不起振，但频率会偏几十 ppm——对串口波特率和射频频率都是实打实的误差。',
    ],
    takeaway: 'C = 2×(CL − Cstray)，Cstray 按 3~5pF 估，就近取 E12 档。',
  },
];
