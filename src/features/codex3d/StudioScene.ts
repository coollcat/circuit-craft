// 图鉴 3D —— 亮色「影棚灯箱」场景（产品摄影棚风格）
// 与 pcb3d 的深夜实验室场景刻意反差：丝印米白背景 + 三点布光 + 柔和地面阴影。
// 元件模型复用 features/pcb3d/models.ts 的 buildComponent()。
// 注意：models.ts 的 GEO/MAT 是模块级共享资源，这里绝不原地修改/释放；
// 亮背景下的观感通过曝光与布光收敛（「影棚模式」），仅 LED 的独立实例材质
// 可安全调低 emissive（暗站里由电流驱动发光，影棚里给收敛的常亮微光）。
import * as THREE from 'three';
import { buildComponent, disposeComponent } from '@/features/pcb3d/models';
import { buildExtraModel } from './extras';
import type { EntryModel } from './specs';
import type { AnnotationDef } from './annotations';

export const STUDIO_BG = '#F4F1E8'; // 丝印米白灯箱

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

/* ---------------- 轨道控制（拖拽旋转 / 滚轮缩放 / 双击复位） ---------------- */
class StudioRig {
  theta = -0.65;
  phi = 0.95;
  radius = 40;
  curTheta = -0.65;
  curPhi = 1.3;
  curRadius = 90; // 当前值（阻尼 + 入场推近）
  target = new THREE.Vector3();
  curTarget = new THREE.Vector3();
  dragging = false;
  private home = { theta: -0.65, phi: 0.95, radius: 40, targetY: 0 };
  private drag: { x: number; y: number } | null = null;
  private el: HTMLElement;

  private onDown = (e: PointerEvent) => {
    this.el.setPointerCapture(e.pointerId);
    this.drag = { x: e.clientX, y: e.clientY };
    this.dragging = true;
  };
  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
    this.theta -= dx * 0.007;
    this.phi = Math.min(1.5, Math.max(0.15, this.phi - dy * 0.007));
  };
  private onUp = () => {
    this.drag = null;
    this.dragging = false;
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.radius = Math.min(220, Math.max(10, this.radius * Math.exp(e.deltaY * 0.0012)));
  };
  private onDbl = () => {
    this.reset();
  };
  private onCtx = (e: Event) => {
    e.preventDefault();
  };

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
    this.target.set(0, this.home.targetY, 0);
  }
  /** 按模型包围球设定复位基准；curRadius 拉高形成入场推近 */
  setHome(radius: number, targetY: number): void {
    this.home.radius = radius;
    this.home.targetY = targetY;
    this.radius = radius;
    this.target.set(0, targetY, 0);
    this.curRadius = radius * 1.9;
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

/* ---------------- 通用兜底模型（无映射条目用：贴片 IC 造型） ---------------- */
function buildGenericFallback(): THREE.Group {
  const g = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(4.2, 1.1, 2.4);
  const padGeo = new THREE.BoxGeometry(1.2, 0.4, 2.6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#23282E', roughness: 0.5, metalness: 0.2 });
  const padMat = new THREE.MeshStandardMaterial({ color: '#C7CCD2', roughness: 0.3, metalness: 0.9 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.75;
  g.add(body);
  for (const dx of [-2.2, 2.2]) {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(dx, 0.35, 0);
    g.add(pad);
  }
  g.userData.disposables = [bodyGeo, padGeo]; // 由 disposeComponent 释放
  g.userData.studioMats = [bodyMat, padMat]; // 由 StudioScene.disposeGroup 释放
  return g;
}

/* ================= 影棚场景主类 ================= */
export class StudioScene {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene = new THREE.Scene();
  private rig: StudioRig;
  private container: HTMLElement;
  private raf = 0;
  private visible = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private comp: THREE.Group | null = null;
  private annotations: AnnotationDef[] = [];
  private groundGeo: THREE.CircleGeometry;
  private groundMat: THREE.MeshStandardMaterial;
  private hover = false;
  private autoRotate: boolean;
  private lastTime = performance.now();
  private projV = new THREE.Vector3();

  /** 每帧回调：标注锚点投影到容器 CSS 像素坐标（供 HTML overlay 定位） */
  onProject: ((pts: ProjectedPoint[]) => void) | null = null;

  private onEnter = () => {
    this.hover = true;
  };
  private onLeave = () => {
    this.hover = false;
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05; // 亮背景：曝光略收，避免白色溢出
    this.renderer.setClearColor(STUDIO_BG);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 800);
    this.rig = new StudioRig(canvas);

    // 摄影棚三点布光：主光（投影） + 冷色反光板补光 + 正面柔光 + 天光
    this.scene.add(new THREE.HemisphereLight('#FFFFFF', '#CFC8B4', 1.0));
    const key = new THREE.DirectionalLight('#FFF6E6', 2.2);
    key.position.set(18, 28, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.camera.near = 4;
    key.shadow.camera.far = 90;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 5; // 柔和边缘
    this.scene.add(key);
    const bounce = new THREE.DirectionalLight('#E8F0FF', 0.7); // 反光板
    bounce.position.set(-16, 8, -12);
    this.scene.add(bounce);
    const front = new THREE.DirectionalLight('#FFFFFF', 0.45);
    front.position.set(0, 10, 24);
    this.scene.add(front);

    // 无缝背景纸地面（接收柔和阴影）
    this.groundGeo = new THREE.CircleGeometry(90, 48);
    this.groundMat = new THREE.MeshStandardMaterial({ color: '#EAE5D6', roughness: 0.96, metalness: 0 });
    const ground = new THREE.Mesh(this.groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.addEventListener('pointerenter', this.onEnter);
    container.addEventListener('pointerleave', this.onLeave);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver(entries => {
      this.visible = entries[0]?.isIntersecting ?? true; // 离屏停渲染
    });
    this.io.observe(container);
    this.resize();

    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      if (!this.visible) return;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private resize(): void {
    const w = this.container.clientWidth || 2;
    const h = this.container.clientHeight || 2;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ---------------- 数据入口 ---------------- */
  /** 换展品：string → extras 实物模型；null → 通用贴片兜底模型 */
  setComponent(model: EntryModel | null, annotations: AnnotationDef[]): void {
    this.annotations = annotations;
    if (this.comp) {
      this.scene.remove(this.comp);
      this.disposeGroup(this.comp);
      this.comp = null;
    }
    const g = typeof model === 'string' ? buildExtraModel(model) : model ? buildComponent(model) : buildGenericFallback();
    // 投影阴影；透明材质（玻璃管/LED 透镜）不投影，避免实心黑影
    g.traverse(o => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.Material;
        o.castShadow = !m.transparent;
      }
    });
    // 影棚模式：LED 实例材质给收敛的常亮微光（该材质为模型实例独有，可安全调整）
    const ledMat = g.userData.ledMat as THREE.MeshStandardMaterial | undefined;
    if (ledMat) ledMat.emissiveIntensity = 0.55;
    this.comp = g;
    this.scene.add(g);
    // 取景：包围球定相机复位距离与注视点
    const sphere = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
    this.rig.setHome(Math.max(sphere.radius * 3.0, 12), sphere.center.y * 0.8);
  }

  private disposeGroup(g: THREE.Group): void {
    disposeComponent(g); // 释放 LED 材质 / 天线管几何等实例资源（共享 GEO/MAT 不动）
    const mats = g.userData.studioMats as THREE.Material[] | undefined;
    if (mats) for (const m of mats) m.dispose();
  }

  /* ---------------- 帧循环 ---------------- */
  private tick(dt: number): void {
    // 缓慢自动旋转：拖拽中 / 悬停 / 减少动态时暂停
    if (this.autoRotate && !this.rig.dragging && !this.hover) {
      this.rig.theta += dt * 0.45;
    }
    this.rig.update(this.camera, 0.16);
    if (this.onProject && this.annotations.length > 0) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const pts: ProjectedPoint[] = [];
      for (const a of this.annotations) {
        const v = this.projV.set(a.anchor[0], a.anchor[1], a.anchor[2]).project(this.camera);
        pts.push({
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h,
          visible: v.z < 1,
        });
      }
      this.onProject(pts);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------- 销毁 ---------------- */
  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.rig.dispose();
    this.container.removeEventListener('pointerenter', this.onEnter);
    this.container.removeEventListener('pointerleave', this.onLeave);
    if (this.comp) {
      this.scene.remove(this.comp);
      this.disposeGroup(this.comp);
      this.comp = null;
    }
    this.groundGeo.dispose();
    this.groundMat.dispose();
    this.renderer.dispose();
    // 主动释放 GL 上下文：反复切换条目时避免累积上下文触发
    // 浏览器 "Too many active WebGL contexts" 警告
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
