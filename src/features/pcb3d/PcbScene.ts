// 3D PCB —— three.js 场景管理（原生 three，无 R3F）
// 职责：渲染器 / 相机 / 灯光 / 自实现轨道控制 / 板体 / 走线 / 过孔 / 元件布局 / 渐进入场 / dispose。
// 坐标：板面为 XZ 平面，y 向上，单位 mm；原理图 16px 网格 = 2.54mm。
import * as THREE from 'three';
import type { CircuitSpec } from '@/engine/types';
import { numParam } from '@/engine/solver';
import { PORT_GEOM, compRadius, portWorldPos } from '@/components/editor/symbols';
import { route45, type Pt } from '@/components/editor/routing';
import { PX2MM, buildComponent, disposeComponent } from './models';

const BOARD_THICKNESS = 1.6;
const BOARD_MIN = 48; // mm
const MARGIN_PX = 64; // 板边留白（原理图 px）
const TRACE_W = 1.15;

interface BoardFrame { cx: number; cy: number; w: number; h: number }
interface CompEntry { sig: string; group: THREE.Group }

/* ---------------- 简易轨道控制（旋转/缩放/平移/双击复位） ---------------- */
class OrbitRig {
  theta = -0.7; phi = 0.85; radius = 120; // 目标值
  curTheta = -0.7; curPhi = 0.85; curRadius = 220; // 当前值（用于阻尼 + 入场推近）
  target = new THREE.Vector3();
  curTarget = new THREE.Vector3();
  private home = { theta: -0.7, phi: 0.85, radius: 120 };
  private drag: { x: number; y: number; mode: 'rotate' | 'pan' } | null = null;
  private el: HTMLElement;
  private onDown = (e: PointerEvent) => {
    this.el.setPointerCapture(e.pointerId);
    const mode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'rotate';
    this.drag = { x: e.clientX, y: e.clientY, mode };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
    if (this.drag.mode === 'rotate') {
      this.theta -= dx * 0.006;
      this.phi = Math.min(1.45, Math.max(0.12, this.phi - dy * 0.006));
    } else {
      const k = this.radius * 0.0016;
      const right = new THREE.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta));
      const fwd = new THREE.Vector3(-Math.sin(this.theta), 0, -Math.cos(this.theta));
      this.target.addScaledVector(right, -dx * k).addScaledVector(fwd, -dy * k * Math.max(Math.sin(this.phi), 0.4));
    }
  };
  private onUp = () => { this.drag = null; };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.radius = Math.min(600, Math.max(24, this.radius * Math.exp(e.deltaY * 0.0012)));
  };
  private onDbl = () => { this.reset(); };
  private onCtx = (e: Event) => { e.preventDefault(); };

  constructor(el: HTMLElement) {
    this.el = el;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('dblclick', this.onDbl);
    el.addEventListener('contextmenu', this.onCtx);
  }
  reset(): void {
    this.theta = this.home.theta;
    this.phi = this.home.phi;
    this.radius = this.home.radius;
    this.target.set(0, 0, 0);
  }
  setHome(radius: number): void {
    this.home.radius = radius;
    if (this.curRadius > radius * 2.5) this.curRadius = radius * 1.8;
  }
  update(camera: THREE.PerspectiveCamera, damp: number): void {
    this.curTheta += (this.theta - this.curTheta) * damp;
    this.curPhi += (this.phi - this.curPhi) * damp;
    this.curRadius += (this.radius - this.curRadius) * damp;
    this.curTarget.lerp(this.target, damp);
    const { curTheta: t, curPhi: p, curRadius: r } = this;
    camera.position.set(
      this.curTarget.x + r * Math.sin(p) * Math.sin(t),
      this.curTarget.y + r * Math.cos(p),
      this.curTarget.z + r * Math.sin(p) * Math.cos(t),
    );
    camera.lookAt(this.curTarget);
  }
  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('wheel', this.onWheel);
    this.el.removeEventListener('dblclick', this.onDbl);
    this.el.removeEventListener('contextmenu', this.onCtx);
  }
}

/* ---------------- 板面网格纹理（0.1 英寸点阵，程序化 canvas） ---------------- */
function makeGridTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256; // 一格贴图 = 25.4mm（10×10 点）
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(63,196,127,0.16)';
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      ctx.beginPath();
      ctx.arc(12.8 + i * 25.6, 12.8 + j * 25.6, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 圆角矩形板体（Extrude 小倒角），顶面 y=0 */
function makeBoardGeometry(w: number, h: number): THREE.ExtrudeGeometry {
  const r = Math.min(4, w / 8, h / 8);
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh); s.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0);
  s.lineTo(hw, hh - r); s.absarc(hw - r, hh - r, r, 0, Math.PI / 2);
  s.lineTo(-hw + r, hh); s.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-hw, -hh + r); s.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: BOARD_THICKNESS, bevelEnabled: true,
    bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 2, curveSegments: 6,
  });
  geo.rotateX(Math.PI / 2); // 躺倒到 XZ 平面
  geo.computeBoundingBox();
  geo.translate(0, -(geo.boundingBox?.max.y ?? 0), 0); // 顶面精确对齐 y=0
  return geo;
}

/* ================= 场景主类 ================= */
export class PcbScene {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene = new THREE.Scene();
  private rig: OrbitRig;
  private container: HTMLElement;
  private raf = 0;
  private visible = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  private boardGroup: THREE.Group | null = null; // 板体+网格+丝印框
  private traceGroup = new THREE.Group();
  private compLayer = new THREE.Group();
  private frame: BoardFrame = { cx: 0, cy: 0, w: BOARD_MIN, h: BOARD_MIN };
  private boardSig = '';
  private traceSig = '';
  private traceDirty = false;
  private circuit: CircuitSpec = { components: [], wires: [] };
  private comps = new Map<string, CompEntry>();
  private wireMats = new Map<string, THREE.MeshStandardMaterial>();
  private traceRes: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] } = { geos: [], mats: [] };
  private currents: Map<string, number> | null = null;
  private gridTex: THREE.CanvasTexture;
  private boardMats: THREE.MeshStandardMaterial[];
  private introT = 0;
  private lastTime = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor('#060A08');
    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 5000);
    this.rig = new OrbitRig(canvas);

    // 深夜实验室灯光：环境底光 + 主方向光 + 绿色轮廓补光
    this.scene.add(new THREE.AmbientLight('#405248', 0.85));
    const key = new THREE.DirectionalLight('#FFF6E8', 2.4);
    key.position.set(60, 110, 50);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#2E9E63', 1.6);
    rim.position.set(-70, 40, -80);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight('#45DCE8', 0.35);
    fill.position.set(-30, 60, 70);
    this.scene.add(fill);

    this.gridTex = makeGridTexture();
    this.boardMats = [
      new THREE.MeshStandardMaterial({ color: '#0D1A12', roughness: 0.62, metalness: 0.18 }), // 阻焊板体
      new THREE.MeshStandardMaterial({ map: this.gridTex, transparent: true, roughness: 0.55, metalness: 0.25, depthWrite: false }), // 网格层
      new THREE.MeshStandardMaterial({ color: '#F2EFE3', roughness: 0.7, metalness: 0.05 }), // 丝印框
    ];
    const copperBase = new THREE.MeshStandardMaterial({ color: '#C9803C', roughness: 0.32, metalness: 0.9 });
    this.boardMats.push(copperBase);

    this.scene.add(this.traceGroup, this.compLayer);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver(entries => {
      this.visible = entries[0]?.isIntersecting ?? true;
    });
    this.io.observe(container);
    this.resize();
    this.rebuildBoard();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      if (!this.visible) return;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /* ---------------- 尺寸 ---------------- */
  private resize(): void {
    const w = this.container.clientWidth || 2;
    const h = this.container.clientHeight || 2;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ---------------- 坐标映射 ---------------- */
  private toBoard(p: Pt): { x: number; z: number } {
    return { x: (p.x - this.frame.cx) * PX2MM, z: (p.y - this.frame.cy) * PX2MM };
  }

  /* ---------------- 数据入口 ---------------- */
  setCircuit(circuit: CircuitSpec): void {
    this.circuit = circuit;
    // 1) 板框（包围盒自适应）
    const frame = this.computeFrame(circuit);
    const boardSig = `${Math.round(frame.w)}x${Math.round(frame.h)}`;
    const frameMoved = frame.cx !== this.frame.cx || frame.cy !== this.frame.cy;
    if (boardSig !== this.boardSig) {
      this.boardSig = boardSig;
      this.frame = frame;
      this.rebuildBoard();
    } else {
      this.frame = frame;
    }
    // 2) 元件增量重建（签名 = 类型+旋转+参数，位置变化只改 transform）
    const seen = new Set<string>();
    circuit.components.forEach((c, idx) => {
      seen.add(c.id);
      const sig = `${c.type}|${c.rotation ?? 0}|${JSON.stringify(c.params ?? {})}`;
      let entry = this.comps.get(c.id);
      if (!entry || entry.sig !== sig) {
        if (entry) {
          this.compLayer.remove(entry.group);
          disposeComponent(entry.group);
        }
        const group = buildComponent(c);
        group.userData.compId = c.id;
        group.userData.popDelay = Math.min(idx * 0.06, 0.6);
        group.scale.setScalar(this.introT >= 1 ? 1 : 0.001);
        entry = { sig, group };
        this.comps.set(c.id, entry);
        this.compLayer.add(group);
      }
      const p = this.toBoard(c);
      entry.group.position.set(p.x, 0, p.z);
      entry.group.rotation.y = -((c.rotation ?? 0) * Math.PI) / 180;
    });
    for (const [id, entry] of this.comps) {
      if (!seen.has(id)) {
        this.compLayer.remove(entry.group);
        disposeComponent(entry.group);
        this.comps.delete(id);
      }
    }
    // 3) 走线层（拖拽中走线端点随动 → 标记脏，rAF 里重建一次）
    if (frameMoved) this.traceSig = '';
    this.traceDirty = true;
  }

  setCurrents(currents: Map<string, number> | null): void {
    this.currents = currents;
    this.applyCurrents();
  }

  private applyCurrents(): void {
    // LED 发光强度 ∝ 电流/额定
    for (const [id, entry] of this.comps) {
      const ledMat = entry.group.userData.ledMat as THREE.MeshStandardMaterial | undefined;
      if (!ledMat) continue;
      const comp = this.circuit.components.find(c => c.id === id);
      const imax = comp ? numParam(comp, 'imax', 0.02) : 0.02;
      const i = Math.abs(this.currents?.get(id) ?? 0);
      ledMat.emissiveIntensity = Math.min(i / imax, 1.35) * 2.2;
    }
    // 走线微光（有电流的铜箔泛绿光）
    for (const [wireId, mat] of this.wireMats) {
      const wire = this.circuit.wires.find(w => w.id === wireId);
      if (!wire) continue;
      const i = Math.max(
        Math.abs(this.currents?.get(wire.from.comp) ?? 0),
        Math.abs(this.currents?.get(wire.to.comp) ?? 0),
      );
      mat.emissiveIntensity = Math.min(i / 0.02, 1) * 0.45;
    }
  }

  /* ---------------- 板框 ---------------- */
  private computeFrame(circuit: CircuitSpec): BoardFrame {
    if (circuit.components.length === 0) {
      return { cx: 0, cy: 0, w: BOARD_MIN * 1.4, h: BOARD_MIN };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of circuit.components) {
      const r = compRadius(c);
      minX = Math.min(minX, c.x - r); maxX = Math.max(maxX, c.x + r);
      minY = Math.min(minY, c.y - r); maxY = Math.max(maxY, c.y + r);
    }
    minX -= MARGIN_PX; minY -= MARGIN_PX; maxX += MARGIN_PX; maxY += MARGIN_PX;
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: Math.max((maxX - minX) * PX2MM, BOARD_MIN),
      h: Math.max((maxY - minY) * PX2MM, BOARD_MIN * 0.75),
    };
  }

  private rebuildBoard(): void {
    if (this.boardGroup) {
      this.scene.remove(this.boardGroup);
      this.boardGroup.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          // 克隆的网格材质/纹理随板重建一起释放（共享基底材质除外）
          if (m instanceof THREE.MeshStandardMaterial && !this.boardMats.includes(m)) {
            m.map?.dispose();
            m.dispose();
          }
        }
      });
    }
    const { w, h } = this.frame;
    const g = new THREE.Group();
    const board = new THREE.Mesh(makeBoardGeometry(w, h), this.boardMats[0]);
    board.position.y = 0;
    g.add(board);
    // 网格层（贴板面）
    const gridGeo = new THREE.PlaneGeometry(w - 2, h - 2);
    const gridTex = this.gridTex.clone();
    gridTex.needsUpdate = true;
    gridTex.repeat.set((w - 2) / 25.4, (h - 2) / 25.4);
    const gridMat = this.boardMats[1].clone();
    gridMat.map = gridTex;
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.02;
    g.add(grid);
    // 丝印白框
    const fw = w - 3, fh = h - 3, t = 0.35;
    for (const [bw, bh, bx, bz] of [
      [fw, t, 0, -fh / 2], [fw, t, 0, fh / 2], [t, fh, -fw / 2, 0], [t, fh, fw / 2, 0],
    ] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.06, bh), this.boardMats[2]);
      bar.position.set(bx, 0.03, bz);
      g.add(bar);
    }
    this.boardGroup = g;
    this.scene.add(g);
    // 视角复位基准
    this.rig.setHome(Math.max(w, h) * 1.25 + 26);
    if (this.rig.radius > Math.max(w, h) * 3) this.rig.reset();
  }

  /* ---------------- 走线 / 过孔 / 焊盘 ---------------- */
  private rebuildTraces(): void {
    const circuit = this.circuit;
    const sig = JSON.stringify({
      w: circuit.wires,
      c: circuit.components.map(c => [c.id, c.x, c.y, c.rotation ?? 0]),
      f: this.boardSig,
    });
    if (sig === this.traceSig) return;
    this.traceSig = sig;
    // 清理旧走线（几何体与材质随层一起释放）
    this.traceGroup.clear();
    for (const geo of this.traceRes.geos) geo.dispose();
    for (const mat of this.traceRes.mats) mat.dispose();
    for (const mat of this.wireMats.values()) mat.dispose();
    this.wireMats.clear();
    const traceRes: typeof this.traceRes = { geos: [], mats: [] };
    this.traceRes = traceRes;

    const compById = new Map(circuit.components.map(c => [c.id, c]));
    const viaGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 14);
    const holeGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.52, 10);
    const padGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.22, 14);
    const holeMat = new THREE.MeshStandardMaterial({ color: '#060A08', roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#F0C078', roughness: 0.3, metalness: 0.95 });
    const stripGeo = new THREE.BoxGeometry(1, 0.12, TRACE_W);
    traceRes.geos.push(viaGeo, holeGeo, padGeo, stripGeo);
    traceRes.mats.push(holeMat, goldMat);
    const vias = new Set<string>();

    const addVia = (x: number, z: number) => {
      const key = `${Math.round(x * 4)}:${Math.round(z * 4)}`;
      if (vias.has(key)) return;
      vias.add(key);
      const via = new THREE.Mesh(viaGeo, goldMat);
      via.position.set(x, 0.26, z);
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(x, 0.27, z);
      this.traceGroup.add(via, hole);
    };

    // 元件端口焊盘
    for (const c of circuit.components) {
      for (const pg of PORT_GEOM[c.type]) {
        const p = this.toBoard(portWorldPos(c, pg.name));
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(p.x, 0.12, p.z);
        this.traceGroup.add(pad);
      }
    }

    // 铜走线（45° 折线 → 贴板条带）
    for (const wire of circuit.wires) {
      const a = compById.get(wire.from.comp);
      const b = compById.get(wire.to.comp);
      if (!a || !b) continue;
      const pts = route45(portWorldPos(a, wire.from.port), portWorldPos(b, wire.to.port)).map(p => this.toBoard(p));
      if (pts.length < 2) continue;
      const mat = new THREE.MeshStandardMaterial({
        color: '#C9803C', roughness: 0.32, metalness: 0.9,
        emissive: new THREE.Color('#3FC47F'), emissiveIntensity: 0,
      });
      this.wireMats.set(wire.id, mat);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        const dx = p1.x - p0.x, dz = p1.z - p0.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.05) continue;
        const strip = new THREE.Mesh(stripGeo, mat);
        strip.scale.x = len + TRACE_W; // 段间重叠盖住接缝
        strip.position.set((p0.x + p1.x) / 2, 0.1, (p0.z + p1.z) / 2);
        strip.rotation.y = -Math.atan2(dz, dx);
        this.traceGroup.add(strip);
      }
      addVia(pts[0].x, pts[0].z);
      addVia(pts[pts.length - 1].x, pts[pts.length - 1].z);
    }
    this.applyCurrents();
  }

  /* ---------------- 帧循环 ---------------- */
  private tick(dt: number): void {
    if (this.traceDirty) {
      this.traceDirty = false;
      this.rebuildTraces();
    }
    // 渐进入场：相机推近 + 元件错峰弹出
    if (this.introT < 1) {
      this.introT = Math.min(1, this.introT + dt / 1.1);
      const ease = 1 - Math.pow(1 - this.introT, 3);
      for (const entry of this.comps.values()) {
        const delay = (entry.group.userData.popDelay as number) ?? 0;
        const t = Math.min(Math.max((ease - delay) / Math.max(1 - delay, 0.01), 0), 1);
        const s = t <= 0 ? 0.001 : t < 0.7 ? t * 1.15 : 1.15 - (t - 0.7) * 0.5;
        entry.group.scale.setScalar(s);
      }
    }
    this.rig.update(this.camera, 0.14);
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------- 销毁 ---------------- */
  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.rig.dispose();
    for (const entry of this.comps.values()) disposeComponent(entry.group);
    this.comps.clear();
    for (const mat of this.wireMats.values()) mat.dispose();
    this.wireMats.clear();
    this.traceGroup.traverse(o => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    // 走线层共享材质（焊盘金 / 钻孔黑）一并释放，避免泄漏材质程序
    for (const mat of this.traceRes.mats) mat.dispose();
    this.traceRes = { geos: [], mats: [] };
    if (this.boardGroup) {
      this.boardGroup.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          if (m instanceof THREE.MeshStandardMaterial && m.map && m !== this.boardMats[1]) m.map.dispose();
          if (m instanceof THREE.MeshStandardMaterial && !this.boardMats.includes(m)) m.dispose();
        }
      });
    }
    this.gridTex.dispose();
    for (const m of this.boardMats) m.dispose();
    this.renderer.dispose();
    // 主动释放 GL 上下文：反复开关 3D 面板时避免累积上下文触发
    // 浏览器 "Too many active WebGL contexts" 警告
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
