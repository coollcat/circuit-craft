// RS-274X Gerber 文件真实生成（教学级最小集：4.6 格式 mm 单位）
// 板 60×40mm，坐标单位 1nm（mm × 1e6）

const X = (mm: number) => Math.round(mm * 1e6);

function header(): string {
  return ['G04 CircuitCraft ESP32-min *', '%FSLAX46Y46*%', '%MOMM*%'].join('\n') + '\n';
}
const footer = 'M02*\n';

/** 画矩形框（D01 draw） */
function rect(x: number, y: number, w: number, h: number): string {
  return [
    `X${X(x)}Y${X(y)}D02*`,
    `X${X(x + w)}Y${X(y)}D01*`,
    `X${X(x + w)}Y${X(y + h)}D01*`,
    `X${X(x)}Y${X(y + h)}D01*`,
    `X${X(x)}Y${X(y)}D01*`,
  ].join('\n') + '\n';
}
/** flash 焊盘 */
function flash(x: number, y: number): string {
  return `X${X(x)}Y${X(y)}D03*\n`;
}
/** 45° 折线走线 */
function trace(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `X${X(x)}Y${X(y)}${i === 0 ? 'D02' : 'D01'}*`).join('\n') + '\n';
}

/** 顶层铜 GTL：电源走线 + 焊盘 */
export function gerberGTL(): string {
  let s = header() + '%ADD10C,0.508*%\n%ADD11R,2.000X1.500*%\n%LPD*%\n';
  s += 'D10*\n';
  s += trace([[2, 8], [10, 8], [14, 12], [22, 12]]); // VBUS: J1→LDO
  s += trace([[24, 12], [32, 12], [36, 16], [44, 16]]); // 3V3: LDO→U1
  s += trace([[30, 20], [38, 28], [46, 28]]); // 信号
  s += 'D11*\n';
  for (const [x, y] of [[2, 8], [22, 12], [24, 12], [44, 16], [46, 28], [10, 30]] as [number, number][]) {
    s += flash(x, y);
  }
  return s + footer;
}

/** 底层铜 GBL：GND 铺铜（区域填充声明 + 边框） */
export function gerberGBL(): string {
  let s = header() + '%ADD10C,0.508*%\n%LPD*%\nG36*\n';
  s += rect(0.5, 0.5, 59, 39);
  s += 'G37*\nD10*\n';
  s += trace([[2, 5], [12, 15], [30, 15]]); // 底层 GND 跳线
  return s + footer;
}

/** 顶层阻焊 GTS：整板开窗焊盘（负片思路简化：焊盘开窗 flash） */
export function gerberGTS(): string {
  let s = header() + '%ADD11R,2.400X1.900*%\n%LPD*%\nD11*\n';
  for (const [x, y] of [[2, 8], [22, 12], [24, 12], [44, 16], [46, 28], [10, 30]] as [number, number][]) {
    s += flash(x, y);
  }
  return s + footer;
}

/** 底层阻焊 GBS */
export function gerberGBS(): string {
  return header() + '%ADD10C,2.000*%\n%LPD*%\nD10*\n' + flash(12, 15) + footer;
}

/** 顶层丝印 GTO：位号框线（文字以线段示意） */
export function gerberGTO(): string {
  let s = header() + '%ADD10C,0.150*%\n%LPD*%\nD10*\n';
  s += rect(38, 6, 20, 26); // U1 模组丝印框
  s += rect(1, 3, 9, 8); // J1
  s += rect(20, 9, 7, 5); // U3
  return s + footer;
}

/** 底层丝印 GBO */
export function gerberGBO(): string {
  return header() + '%ADD10C,0.150*%\n%LPD*%\nD10*\n' + rect(4, 30, 12, 6) + footer;
}

/** 板框 GKO */
export function gerberGKO(): string {
  return header() + '%ADD10C,0.100*%\n%LPD*%\nD10*\n' + rect(0, 0, 60, 40) + footer;
}

/** 钻孔 TXT（Excellon） */
export function drillTXT(): string {
  return [
    'M48',
    ';CircuitCraft ESP32-min drill',
    'METRIC,TZ',
    'T1C0.300',
    'T2C1.000',
    '%',
    'T1',
    'X10.0Y30.0',
    'X12.0Y15.0',
    'T2',
    'X2.0Y8.0',
    'X44.0Y16.0',
    'M30',
    '',
  ].join('\n');
}

export const GERBER_FILES: { name: string; gen: () => string; desc: string }[] = [
  { name: 'ESP32-min.GTL', gen: gerberGTL, desc: '顶层铜 Top Copper' },
  { name: 'ESP32-min.GBL', gen: gerberGBL, desc: '底层铜 Bottom Copper' },
  { name: 'ESP32-min.GTS', gen: gerberGTS, desc: '顶层阻焊 Top Soldermask' },
  { name: 'ESP32-min.GBS', gen: gerberGBS, desc: '底层阻焊 Bottom Soldermask' },
  { name: 'ESP32-min.GTO', gen: gerberGTO, desc: '顶层丝印 Top Silkscreen' },
  { name: 'ESP32-min.GBO', gen: gerberGBO, desc: '底层丝印 Bottom Silkscreen' },
  { name: 'ESP32-min.GKO', gen: gerberGKO, desc: '板框 Board Outline' },
  { name: 'ESP32-min.TXT', gen: drillTXT, desc: '钻孔 Drill (Excellon)' },
];
