// 回路工坊 — 概念标签注册表（内容审计用）
//
// 约定（由 levels.test.ts 强制）：
//   1. 每个关卡必须声明 1~3 个 concept，且必须在本表注册；
//   2. 每个 concept 必须能在该关的「验收目标 / 观测探针」里找到证据（防「教 A 考 B」）；
//   3. 新增 concept 时，先想清楚「本关用什么目标证明玩家真的练到了它」，再把谓词写在这里。
//
// 谓词返回 null = 证据成立；返回字符串 = 失败原因（会出现在测试报错里）。
import type { ComponentType, GoalCheck, LevelDef } from '@/engine/types';

/** 关卡全部元件（preset + palette） */
function comps(l: LevelDef) {
  return [...l.preset.components, ...l.palette];
}
function hasComp(l: LevelDef, ...types: ComponentType[]) {
  return comps(l).some(c => types.includes(c.type));
}
function hasKind(l: LevelDef, ...kinds: GoalCheck['kind'][]) {
  return l.goals.some(g => kinds.includes(g.kind));
}
function hasParam(l: LevelDef, ...keys: string[]) {
  return l.goals.some(g => g.kind === 'param' && keys.includes(g.param));
}
function countKind(l: LevelDef, kind: GoalCheck['kind']) {
  return l.goals.filter(g => g.kind === kind).length;
}
function hasProbes(l: LevelDef) {
  return (l.sim?.probes?.length ?? 0) > 0;
}
/** 接到 gnd 元件的 connected 目标数（地平面/回流路径的证据） */
function gndWires(l: LevelDef) {
  const gndIds = new Set(comps(l).filter(c => c.type === 'gnd').map(c => c.id));
  return l.goals.filter(
    g => g.kind === 'connected' && (gndIds.has(g.a.comp) || gndIds.has(g.b.comp)),
  ).length;
}
/** 运放跟随器接法：out 直接回接 inn */
function hasFollower(l: LevelDef) {
  return l.goals.some(g => {
    if (g.kind !== 'connected' || g.a.comp !== g.b.comp) return false;
    const c = comps(l).find(x => x.id === g.a.comp);
    if (!c || c.type !== 'opamp') return false;
    const ports = [g.a.port, g.b.port];
    return ports.includes('out') && ports.includes('inn');
  });
}
/** 存在窄窗口电阻目标（E24 选型类，窗口宽度 ≤ 40Ω） */
function narrowResistorGoal(l: LevelDef) {
  return l.goals.some(
    g => g.kind === 'param' && g.param === 'resistance' && g.max !== undefined && g.min !== undefined && g.max - g.min <= 40,
  );
}
/** 有大电流目标（载流/线宽类，≥30mA） */
function highCurrentGoal(l: LevelDef) {
  return l.goals.some(g => g.kind === 'branch-current' && g.max !== undefined && g.max >= 30);
}

type Evidence = (l: LevelDef) => string | null;

/** 谓词 → 证据函数：不满足时给出人话原因 */
function ev(check: (l: LevelDef) => boolean, need: string): Evidence {
  return l => (check(l) ? null : `本关缺少可用作证据的东西：${need}`);
}

export const CONCEPTS: Record<string, Evidence> = {
  // ---- 基础电路 ----
  回路: ev(l => hasKind(l, 'connected'), '一条 connected（连通性）目标'),
  欧姆定律: ev(l => hasKind(l, 'branch-current') || hasParam(l, 'resistance'), 'branch-current 或 resistance 参数目标'),
  电压测量: ev(l => hasKind(l, 'node-voltage') && hasKind(l, 'connected'), 'node-voltage + connected 目标'),
  并联: ev(l => hasKind(l, 'node-voltage') || countKind(l, 'branch-current') >= 2, '节点电压或两条以上支路电流目标'),
  'E24 标准值': ev(l => hasParam(l, 'resistance'), 'resistance 参数目标'),
  限流电阻: ev(l => hasKind(l, 'branch-current', 'led-lit') || hasParam(l, 'resistance'), 'branch-current / led-lit / resistance 目标'),
  'LED 极性': ev(l => hasKind(l, 'led-lit'), 'led-lit 目标（接反则不亮）'),
  分压: ev(l => hasKind(l, 'node-voltage') || hasParam(l, 'resistance'), 'node-voltage 或 resistance 目标'),
  电容储能: ev(l => hasComp(l, 'capacitor') && hasKind(l, 'node-voltage'), '电容元件 + node-voltage 目标'),
  'RC 充放电': ev(l => hasComp(l, 'capacitor') && (hasKind(l, 'node-voltage') || hasProbes(l)), '电容元件 + 节点电压目标或示波器探针'),
  'RC 低通': ev(l => hasComp(l, 'capacitor') && (hasKind(l, 'node-voltage') || hasProbes(l)), '电容元件 + 输出节点目标/探针'),
  截止频率: ev(l => hasComp(l, 'capacitor') && hasKind(l, 'node-voltage'), '电容元件 + 输出节点电压目标'),
  示波器观测: ev(hasProbes, 'sim.probes 示波器探针'),
  二极管单向导电: ev(
    l => hasComp(l, 'diode', 'schottky') && (hasKind(l, 'branch-current') || hasParam(l, 'capacitance', 'resistance')),
    '二极管元件 + 支路电流/参数目标',
  ),
  电感电流惯性: ev(l => hasComp(l, 'inductor') && hasKind(l, 'branch-current'), '电感元件 + 支路电流目标'),
  稳态分析: ev(l => hasKind(l, 'branch-current'), '稳态支路电流目标'),

  // ---- 半导体与开关 ----
  三极管开关: ev(l => hasComp(l, 'npn') && hasKind(l, 'led-lit', 'branch-current'), 'NPN 元件 + LED/支路电流目标'),
  基极偏置: ev(l => hasComp(l, 'npn') && hasParam(l, 'resistance'), 'NPN 元件 + 基极电阻参数目标'),
  '输入-控制-输出': ev(l => hasComp(l, 'npn') && hasKind(l, 'led-lit'), 'NPN + led-lit 目标（控制链路成立）'),
  包络检波: ev(
    l => hasComp(l, 'diode', 'schottky') && hasParam(l, 'capacitance') && hasParam(l, 'resistance'),
    '二极管 + RC 两个参数目标',
  ),

  // ---- PCB 与布局 ----
  封装: ev(l => hasKind(l, 'component-placed') && l.palette.length > 0, 'palette 元件 + component-placed 目标'),
  布局顺序: ev(l => hasKind(l, 'component-placed') && countKind(l, 'connected') >= 4, 'component-placed + 4 条以上连线目标'),
  去耦电容: ev(l => hasParam(l, 'capacitance'), 'capacitance 参数目标'),
  '45° 走线': ev(l => hasKind(l, 'connected') && hasKind(l, 'node-voltage'), '连线目标 + 节点电压目标'),
  地平面: ev(l => gndWires(l) >= 2, '两条以上汇入 GND 的连线目标'),
  回流路径: ev(l => gndWires(l) >= 2, '两条以上汇入 GND 的连线目标'),
  线宽载流: ev(highCurrentGoal, '≥30mA 的支路电流目标'),
  功率校核: ev(l => hasParam(l, 'power', 'imax'), 'power（额定功率）或 imax（额定电流）参数目标'),

  // ---- 模拟与信号 ----
  同相放大: ev(l => hasComp(l, 'opamp') && hasParam(l, 'resistance') && hasKind(l, 'node-voltage'), '运放 + 增益电阻目标 + 输出节点目标'),
  运放虚短虚断: ev(l => hasComp(l, 'opamp') && hasKind(l, 'node-voltage'), '运放 + 节点电压目标'),
  有源滤波: ev(l => hasComp(l, 'opamp') && hasComp(l, 'capacitor'), '运放 + 电容元件'),
  电压跟随器: ev(hasFollower, 'opamp 的 out↔inn 直连目标'),
  微弱信号: ev(l => hasComp(l, 'opamp') && hasKind(l, 'node-voltage') && hasParam(l, 'resistance'), '运放 + 高增益电阻 + 输出节点目标'),
  信噪比: ev(l => hasComp(l, 'sensor') && hasKind(l, 'node-voltage'), '传感器 + 节点电压目标'),
  电位器分压: ev(l => hasComp(l, 'pot') && hasParam(l, 'wiper'), '电位器 + wiper 参数目标'),
  'ADC 量化': ev(l => hasComp(l, 'mcu') && hasKind(l, 'node-voltage'), 'MCU + 节点电压目标'),
  信号链: ev(l => hasComp(l, 'sensor') && countKind(l, 'connected') >= 6, '传感器 + 6 条以上连线目标'),
  迟滞比较器: ev(l => hasComp(l, 'opamp') && hasParam(l, 'resistance') && hasKind(l, 'node-voltage'), '运放 + 反馈电阻 + 阈值节点目标'),
  正反馈: ev(l => hasComp(l, 'opamp') && hasParam(l, 'resistance') && hasKind(l, 'node-voltage'), '运放 + 反馈电阻 + 阈值节点目标'),
  衰减器: ev(l => hasParam(l, 'resistance') && countKind(l, 'param') >= 3, 'π/T 型三颗电阻的参数目标'),
  陷波: ev(l => hasParam(l, 'inductance') && hasParam(l, 'capacitance'), 'LC 两个参数目标'),
  'LC 谐振': ev(l => hasParam(l, 'inductance') && hasParam(l, 'capacitance'), 'LC 两个参数目标'),

  // ---- 电源与选型 ----
  功耗预算: ev(l => countKind(l, 'branch-current') >= 2, '两条以上支路电流目标（分账）'),
  数据手册: ev(l => hasParam(l, 'resistance') && hasKind(l, 'branch-current'), '阻值目标 + 支路电流目标'),
  降额设计: ev(l => hasParam(l, 'resistance') && hasKind(l, 'branch-current'), '阻值目标 + 支路电流目标'),
  'LDO 选型': ev(l => hasComp(l, 'ic') && (hasParam(l, 'imax') || hasKind(l, 'node-voltage')), 'LDO 元件 + 定额/输出目标'),
  压差: ev(l => hasComp(l, 'ic') && hasKind(l, 'node-voltage'), 'LDO 元件 + 输出节点目标'),
  可采购设计: ev(narrowResistorGoal, '窄窗口的标准阻值目标'),
  BOM: ev(l => countKind(l, 'connected') >= 8, '8 条以上连线目标（完整系统）'),
  最小系统: ev(l => countKind(l, 'connected') >= 8 && hasComp(l, 'mcu'), 'MCU + 8 条以上连线目标'),

  // ---- 无线 ----
  调制: ev(l => hasParam(l, 'freq'), 'freq 参数目标'),
  载波: ev(l => hasParam(l, 'freq'), 'freq 参数目标'),
  波长: ev(l => hasParam(l, 'freq'), 'freq 参数目标'),
  阻抗匹配: ev(
    l => hasParam(l, 'impedance') || (countKind(l, 'param') >= 3 && hasKind(l, 'node-voltage')),
    'impedance 参数目标（或 π 型网络参数 + 输出节点目标）',
  ),
  反射系数: ev(l => hasParam(l, 'impedance'), 'impedance 参数目标'),
  射频布局: ev(l => hasParam(l, 'impedance') && hasParam(l, 'capacitance'), '阻抗 + 去耦容值两个目标'),
  天线匹配: ev(l => hasParam(l, 'impedance'), 'impedance 参数目标'),
  物联网节点: ev(l => hasComp(l, 'antenna') && hasKind(l, 'led-lit'), '天线 + LED 指示目标'),

  // ---- 单片机支线 ----
  'GPIO 输出': ev(l => hasComp(l, 'mcu') && hasKind(l, 'led-lit'), 'MCU + led-lit 目标'),
  'PWM 占空比': ev(l => hasParam(l, 'duty'), 'duty（占空比）参数目标'),
  平均电压: ev(l => hasParam(l, 'duty'), 'duty 参数目标（平均电压 = Vcc × D）'),
  上拉电阻: ev(l => hasComp(l, 'mcu') && hasParam(l, 'resistance') && hasKind(l, 'node-voltage'), 'MCU + 上拉阻值 + 引脚电平目标'),
  按键输入: ev(l => hasComp(l, 'button') && hasKind(l, 'connected'), '按键元件 + 连线目标'),
  中断: ev(l => hasComp(l, 'button') && hasKind(l, 'led-lit'), '按键 + LED 指示目标（事件响应）'),
  奈奎斯特: ev(l => hasParam(l, 'fs'), 'fs（采样率）参数目标'),
  混叠: ev(l => hasParam(l, 'fs'), 'fs 参数目标（采样率不足即混叠）'),
};
