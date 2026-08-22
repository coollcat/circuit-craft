// 回路工坊 — 全站共享类型契约（冻结，任何代理不得修改）
export type NPCId = 'laozhou' | 'xiaohan' | 'lingong';
export interface DialogueLine { speaker: NPCId; text: string; }

export type ComponentType =
  | 'vsrc' | 'battery' | 'gnd'
  | 'resistor' | 'capacitor' | 'inductor' | 'pot'
  | 'diode' | 'led' | 'zener'
  | 'switch' | 'button'
  | 'npn' | 'pmos' | 'nmos'
  | 'opamp'
  | 'crystal' | 'antenna' | 'sensor' | 'mcu' | 'ic' | 'fuse'
  | 'funcgen' | 'voltmeter' | 'ammeter' | 'module';

export interface PortRef { comp: string; port: string; }
// 导线层（wave6 新增，可选，向后兼容）：缺省 'top'，旧导线不变；仅视觉/组织分层，不影响仿真连通性。
// editorx7 扩展为四层板：top → in1 → in2 → bottom（对齐真实 4 层 PCB），旧数据 'top'/'bottom' 天然兼容。
export type WireLayer = 'top' | 'in1' | 'in2' | 'bottom';
// 拐点（wirefix 新增，可选，向后兼容）：用户手动放置的中间拐点（世界坐标）；
// hole:true（wave6）表示该拐点同时是过孔/换层点，经过后导线切到另一层。
export interface ViaPoint { x: number; y: number; hole?: boolean }
// via 存在且非空时渲染/命中/粒子走「端口A → via… → 端口B」折线（相邻点 route45 桥接），否则用 route45 自动走线。
export interface WireSpec { id: string; from: PortRef; to: PortRef; via?: ViaPoint[]; layer?: WireLayer; }

export interface ComponentSpec {
  id: string;
  type: ComponentType;
  x: number; y: number;
  rotation?: 0 | 90 | 180 | 270;
  params?: Record<string, number | string | boolean>;
  locked?: boolean;
}
export interface CircuitSpec { components: ComponentSpec[]; wires: WireSpec[]; }

export type GoalCheck =
  | { kind: 'connected'; a: PortRef; b: PortRef }
  | { kind: 'component-placed'; type: ComponentType; count?: number }
  | { kind: 'param'; comp: string; param: string; min?: number; max?: number }
  | { kind: 'node-voltage'; node: PortRef; min: number; max: number }
  | { kind: 'branch-current'; comp: string; min: number; max: number }
  | { kind: 'led-lit'; comp: string }
  | { kind: 'custom'; id: string; description: string };

export interface StarCondition { id: string; label: string; check: 'no-hint' | 'first-try' | 'time' | 'custom'; value?: number; }

export interface LevelDef {
  id: string;
  track: 'main' | 'side-a' | 'side-b';
  chapter: number;
  index: number;
  title: string;
  subtitle?: string;
  briefing: string;
  intro: DialogueLine[];
  outro: DialogueLine[];
  palette: ComponentSpec[];
  preset: CircuitSpec;
  goals: GoalCheck[];
  stars: StarCondition[];
  hints: [string, string, string];
  knowledge: { title: string; body: string };
  sim?: { duration?: number; probes?: PortRef[] };
}
