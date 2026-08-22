// 3D PCB / 沙盒 —— 工程文件（.ccproj.json）导入导出
// 与存档槽 / 分享码并存：面向「保存到本地磁盘 / 从磁盘打开」的场景。
import type { CircuitSpec, ComponentSpec, ComponentType, ViaPoint, WireSpec } from '@/engine/types';

export const PROJECT_KIND = 'ccproj';
export const PROJECT_VERSION = 1;

export interface CCProject {
  app: 'circuitcraft';
  kind: typeof PROJECT_KIND;
  version: number;
  name: string;
  savedAt: string; // ISO 时间戳
  circuit: CircuitSpec;
  meta: { components: number; wires: number; source: string };
}

const KNOWN_TYPES = new Set<ComponentType>([
  'vsrc', 'battery', 'gnd',
  'resistor', 'capacitor', 'inductor', 'pot',
  'diode', 'led', 'zener',
  'switch', 'button',
  'npn', 'pmos', 'nmos',
  'opamp',
  'crystal', 'antenna', 'sensor', 'mcu', 'ic', 'fuse',
  'funcgen', 'voltmeter', 'ammeter', 'module',
]);

/** 序列化当前沙盒电路为工程文件 JSON 文本 */
export function serializeProject(name: string, circuit: CircuitSpec): string {
  const proj: CCProject = {
    app: 'circuitcraft',
    kind: PROJECT_KIND,
    version: PROJECT_VERSION,
    name: name.trim() || '未命名电路',
    savedAt: new Date().toISOString(),
    circuit,
    meta: {
      components: circuit.components.length,
      wires: circuit.wires.length,
      source: 'sandbox',
    },
  };
  return JSON.stringify(proj, null, 2);
}

/** 触发浏览器下载 .ccproj.json */
export function downloadProject(name: string, circuit: CircuitSpec): string {
  const text = serializeProject(name, circuit);
  const safe = (name.trim() || '未命名电路').replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${safe}.ccproj.json`;
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return filename;
}

export type ParseProjectResult =
  | { ok: true; name: string; circuit: CircuitSpec }
  | { ok: false; error: string };

function isPortRef(v: unknown): v is { comp: string; port: string } {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.comp === 'string' && typeof o.port === 'string';
}

function sanitizeComponent(v: unknown): ComponentSpec | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) return null;
  if (typeof o.type !== 'string' || !KNOWN_TYPES.has(o.type as ComponentType)) return null;
  if (typeof o.x !== 'number' || typeof o.y !== 'number' || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return null;
  const comp: ComponentSpec = { id: o.id, type: o.type as ComponentType, x: o.x, y: o.y };
  if (o.rotation === 0 || o.rotation === 90 || o.rotation === 180 || o.rotation === 270) comp.rotation = o.rotation;
  if (typeof o.params === 'object' && o.params !== null) {
    const params: Record<string, number | string | boolean> = {};
    for (const [k, val] of Object.entries(o.params as Record<string, unknown>)) {
      if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') params[k] = val;
    }
    comp.params = params;
  }
  if (o.locked === true) comp.locked = true;
  return comp;
}

/** 手动拐点（可选字段，非法一律丢弃而不是整线判废——via 丢了只是走线变回自动 45°）；hole:true 保留（过孔换层点） */
function sanitizeVia(v: unknown): ViaPoint[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const pts: ViaPoint[] = [];
  for (const p of v) {
    if (typeof p !== 'object' || p === null) continue;
    const o = p as Record<string, unknown>;
    if (typeof o.x === 'number' && Number.isFinite(o.x) && typeof o.y === 'number' && Number.isFinite(o.y)) {
      pts.push(o.hole === true ? { x: o.x, y: o.y, hole: true } : { x: o.x, y: o.y });
    }
  }
  return pts.length > 0 ? pts : undefined;
}

function sanitizeWire(v: unknown): WireSpec | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || !isPortRef(o.from) || !isPortRef(o.to)) return null;
  const wire: WireSpec = { id: o.id, from: { comp: o.from.comp, port: o.from.port }, to: { comp: o.to.comp, port: o.to.port } };
  const via = sanitizeVia(o.via);
  if (via) wire.via = via;
  if (o.layer === 'top' || o.layer === 'in1' || o.layer === 'in2' || o.layer === 'bottom') {
    wire.layer = o.layer; // 四层板合法值保留；非法层值丢弃 = 缺省顶层
  }
  return wire;
}

/**
 * 解析并校验 .ccproj.json 文本。
 * 任何结构问题都返回中文友好错误，不抛异常。
 */
export function parseProject(text: string): ParseProjectResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是合法的 JSON——它可能已损坏，或不是回路工坊的工程文件。' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: '文件内容不是工程对象。请选择 .ccproj.json 工程文件。' };
  }
  const o = raw as Record<string, unknown>;
  if (o.app !== 'circuitcraft' || o.kind !== PROJECT_KIND) {
    return { ok: false, error: '这不是回路工坊的工程文件（缺少 circuitcraft/ccproj 标识）。' };
  }
  if (typeof o.version !== 'number' || o.version > PROJECT_VERSION) {
    return { ok: false, error: `工程文件版本（v${String(o.version)}）高于当前支持的 v${PROJECT_VERSION}，请升级应用后再导入。` };
  }
  const c = o.circuit as Record<string, unknown> | undefined;
  if (!c || !Array.isArray(c.components) || !Array.isArray(c.wires)) {
    return { ok: false, error: '工程文件缺少电路数据（components/wires），文件可能不完整。' };
  }
  const components: ComponentSpec[] = [];
  for (const item of c.components as unknown[]) {
    const comp = sanitizeComponent(item);
    if (!comp) {
      const id = (item as Record<string, unknown> | null)?.id;
      return { ok: false, error: `元件${typeof id === 'string' ? `「${id}」` : ''}的数据不完整或类型无法识别，导入中止。` };
    }
    components.push(comp);
  }
  const ids = new Set(components.map(x => x.id));
  if (ids.size !== components.length) {
    return { ok: false, error: '工程文件里存在重复的元件位号，文件可能已损坏。' };
  }
  const wires: WireSpec[] = [];
  for (const item of c.wires as unknown[]) {
    const wire = sanitizeWire(item);
    if (!wire) return { ok: false, error: '存在格式不正确的导线，文件可能已损坏。' };
    if (!ids.has(wire.from.comp) || !ids.has(wire.to.comp)) {
      return { ok: false, error: `导线 ${wire.id} 指向了不存在的元件，文件可能已损坏。` };
    }
    wires.push(wire);
  }
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : '导入的工程';
  return { ok: true, name, circuit: { components, wires } };
}
