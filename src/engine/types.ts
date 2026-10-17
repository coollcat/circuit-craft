// 回路工坊 — 全站共享类型契约（v2 扩展：新增元件需同步 solver 与两层 symbols，见 AGENTS 约定）
export type NPCId = 'laozhou' | 'xiaohan' | 'lingong';
export interface DialogueLine { speaker: NPCId; text: string; }

export type ComponentType =
  | 'vsrc' | 'battery' | 'gnd'
  | 'resistor' | 'capacitor' | 'inductor' | 'pot'
  | 'diode' | 'schottky' | 'led' | 'zener'
  | 'ldr' | 'thermistor'
  | 'switch' | 'button'
  | 'npn' | 'pmos' | 'nmos'
  | 'opamp'
  | 'crystal' | 'antenna' | 'sensor' | 'mcu' | 'ic' | 'fuse'
  | 'funcgen' | 'voltmeter' | 'ammeter' | 'module'
  | 'buzzer' | 'speaker' | 'transformer';

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
  sim?: {
    /** 作者侧验收窗口（毫秒）：levels.test.ts 的动态关瞬态判定用它作参考时长。
     *  不是示波器时基——时基由 WaveformPanel 的 defaultTimebase 按信号频率自适应。 */
    duration?: number;
    probes?: PortRef[];
  };
  /* ---------- 教学增强字段（均可选，向后兼容；由 lead 冻结接口） ---------- */
  /** 本关考察的概念标签，供内容审计测试核对「教 A 考 B」 */
  concept?: string[];
  /** 本关主导公式：验收台「公式辅助」展示，expr 为通式、vars 说明符号、note 一句话用法 */
  formula?: { expr: string; vars: string; note: string };
  /** 相关图鉴条目 id（可深链到 /codex#<id>） */
  codex?: string[];
  /** 通关后 3 行小结（提取练习用）；缺省时界面回落到 knowledge 摘要 */
  recap?: [string, string, string];
}
