// 3D PCB —— 元件 3D 化映射表
// 单位统一为毫米（mm）：原理图 16px 网格 = 2.54mm（0.1 英寸）。
// 所有模型共享几何体与材质（模块级缓存），控制同屏 mesh 数与显存占用。
import * as THREE from 'three';
import type { ComponentSpec } from '@/engine/types';
import { numParam } from '@/engine/solver';
import { resistorBands } from './resistorColors';

/** 原理图 px → 板级 mm */
export const PX2MM = 2.54 / 16;

/* ---------------- 共享几何体（永不 dispose，模块生命周期） ---------------- */
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 10),
  dome: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: new THREE.TorusGeometry(1, 0.3, 8, 20),
};

/* ---------------- 共享材质 ---------------- */
function std(color: string, roughness: number, metalness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
const MAT = {
  black: std('#1B1E22', 0.55, 0.15),
  blackFlat: std('#14171A', 0.8, 0.05),
  silver: std('#C7CCD2', 0.28, 0.95),
  gold: std('#F0C078', 0.3, 0.95),
  copper: std('#C9803C', 0.35, 0.9),
  lead: std('#AAB2BC', 0.35, 0.9),
  blue: std('#2456C8', 0.5, 0.25),
  whitePlastic: std('#E8E6DF', 0.65, 0.02),
  redPlastic: std('#C8322B', 0.5, 0.1),
  battBody: std('#21362C', 0.5, 0.35),
  battTop: std('#303036', 0.4, 0.6),
  ferrite: std('#3A3230', 0.65, 0.2),
  ceramic: std('#C9973F', 0.6, 0.05),
  sensor: std('#23282E', 0.5, 0.4),
  glass: new THREE.MeshStandardMaterial({ color: '#BFE0D8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.35 }),
};

/* ---------------- 小工具 ---------------- */
function box(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(GEO.box, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  return m;
}
function cylY(mat: THREE.Material, r: number, h: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(GEO.cyl, mat);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  return m;
}
/** 两点之间的圆柱（引脚/斜线引脚） */
function leadBetween(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(GEO.cylLow, mat);
  m.scale.set(r, len, r);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}
/** 直插引脚：从 (x, z) 板面起到高度 h */
function pin(x: number, z: number, h: number, r = 0.28): THREE.Mesh {
  return cylY(MAT.lead, r, h, x, h / 2, z);
}
/** 贴片引脚（小银块） */
function smdPin(x: number, z: number): THREE.Mesh {
  return box(MAT.silver, 1.1, 0.3, 0.7, x, 0.35, z);
}

/* ---------------- 电阻色环纹理（按阻值缓存） ---------------- */
const bandTextureCache = new Map<string, THREE.CanvasTexture>();
function resistorTexture(ohms: number): THREE.CanvasTexture {
  const key = String(Math.round(ohms));
  const cached = bandTextureCache.get(key);
  if (cached) return cached;
  const bands = resistorBands(ohms);
  const cv = document.createElement('canvas');
  cv.width = 48;
  cv.height = 160; // 高度方向 = 圆柱长度方向
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#C8A46B'; // 碳膜米色基底
  ctx.fillRect(0, 0, cv.width, cv.height);
  // 四条环（v 方向位置）：数字1 数字2 倍率 | 误差（靠近一端）
  const pos = [0.22, 0.38, 0.54, 0.86];
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, pos[i] * cv.height, cv.width, 0.09 * cv.height);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  bandTextureCache.set(key, tex);
  return tex;
}
const resistorMatCache = new Map<string, THREE.MeshStandardMaterial>();
function resistorMaterial(ohms: number): THREE.MeshStandardMaterial {
  const key = String(Math.round(ohms));
  const cached = resistorMatCache.get(key);
  if (cached) return cached;
  const mat = new THREE.MeshStandardMaterial({ map: resistorTexture(ohms), roughness: 0.6, metalness: 0.05 });
  resistorMatCache.set(key, mat);
  return mat;
}

/* ---------------- LED 颜色（按正向压降推断） ---------------- */
export function ledColorOf(comp: ComponentSpec): string {
  const vf = numParam(comp, 'vf', 2);
  if (vf <= 2.2) return '#FF4A3C'; // 红
  if (vf <= 2.6) return '#FFC23C'; // 黄
  if (vf <= 2.9) return '#43E08A'; // 绿
  return '#7FB2FF'; // 蓝/白
}

/* ================= 元件构建主入口 ================= */
/**
 * 由 ComponentSpec 构建 3D 元件组。
 * 局部坐标：x 沿原理图 x 轴，z 沿原理图 y 轴，y 向上，单位 mm。
 * group.userData.ledMat —— LED 发光材质（由场景按电流调 emissive）。
 * group.userData.disposables —— 非共享几何体，重建时需 dispose。
 */
export function buildComponent(comp: ComponentSpec): THREE.Group {
  const g = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  g.userData.disposables = disposables;

  switch (comp.type) {
    case 'resistor': {
      const r = numParam(comp, ['resistance', 'r'], 220);
      const body = new THREE.Mesh(GEO.cyl, resistorMaterial(r));
      body.scale.set(1.1, 5.2, 1.1);
      body.rotation.z = Math.PI / 2;
      body.position.y = 1.5;
      g.add(body);
      g.add(leadBetween(MAT.lead, new THREE.Vector3(-2.6, 1.5, 0), new THREE.Vector3(-5.08, 0.15, 0), 0.3));
      g.add(leadBetween(MAT.lead, new THREE.Vector3(2.6, 1.5, 0), new THREE.Vector3(5.08, 0.15, 0), 0.3));
      break;
    }
    case 'pot': {
      g.add(box(MAT.blue, 7, 2.8, 7, 0, 1.4, 0));
      g.add(cylY(MAT.whitePlastic, 2.4, 1.2, 0, 3.4, 0));
      g.add(box(MAT.blackFlat, 0.5, 0.3, 3.6, 0, 4.05, 0)); // 旋钮刻度槽
      g.add(pin(-2.54, 2.54, 0.9), pin(2.54, 2.54, 0.9), pin(0, -2.54, 0.9));
      break;
    }
    case 'capacitor': {
      const c = numParam(comp, ['capacitance', 'c'], 1e-6);
      if (c >= 1e-6) {
        // 电解电容：深色铝壳 + 银色顶部（带防爆刻痕）
        g.add(cylY(MAT.blue, 1.9, 4.6, 0, 2.3, 0));
        g.add(cylY(MAT.silver, 1.85, 0.35, 0, 4.75, 0));
        g.add(box(MAT.blackFlat, 2.6, 0.1, 0.35, 0, 4.95, 0));
        g.add(box(MAT.blackFlat, 0.35, 0.1, 2.6, 0, 4.95, 0));
        g.add(pin(-1.27, 0, 1.2), pin(1.27, 0, 1.2));
        // 负极白条
        g.add(box(MAT.whitePlastic, 0.7, 3.6, 0.15, -1.55, 2.4, 1.05));
      } else {
        // 陶瓷电容：土黄色小方块
        g.add(box(MAT.ceramic, 3.6, 2.4, 1.6, 0, 1.4, 0));
        g.add(pin(-1.27, 0, 1.1), pin(1.27, 0, 1.1));
      }
      break;
    }
    case 'inductor': {
      const rod = new THREE.Mesh(GEO.cyl, MAT.ferrite);
      rod.scale.set(1.2, 5.6, 1.2);
      rod.rotation.z = Math.PI / 2;
      rod.position.y = 1.5;
      g.add(rod);
      for (const dx of [-1.4, 0, 1.4]) {
        const ring = new THREE.Mesh(GEO.torus, MAT.copper);
        ring.scale.setScalar(1.35);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(dx, 1.5, 0);
        g.add(ring);
      }
      g.add(leadBetween(MAT.lead, new THREE.Vector3(-2.8, 1.5, 0), new THREE.Vector3(-5.08, 0.15, 0), 0.3));
      g.add(leadBetween(MAT.lead, new THREE.Vector3(2.8, 1.5, 0), new THREE.Vector3(5.08, 0.15, 0), 0.3));
      break;
    }
    case 'led': {
      const color = ledColorOf(comp);
      const ledMat = new THREE.MeshStandardMaterial({
        color, roughness: 0.25, metalness: 0.05,
        transparent: true, opacity: 0.85,
        emissive: new THREE.Color(color), emissiveIntensity: 0,
      });
      g.userData.ledMat = ledMat; // 由 disposeComponent 统一释放
      g.add(cylY(ledMat, 1.6, 2.2, 0, 1.9, 0));
      const dome = new THREE.Mesh(GEO.dome, ledMat);
      dome.scale.setScalar(1.6);
      dome.position.y = 3.0;
      g.add(dome);
      g.add(pin(-1.27, 0, 1.2), pin(1.27, 0, 0.7));
      break;
    }
    case 'diode':
    case 'zener':
    case 'schottky': {
      const body = new THREE.Mesh(GEO.cyl, comp.type === 'schottky' ? MAT.blackFlat : MAT.black);
      body.scale.set(1.05, 4.4, 1.05);
      body.rotation.z = Math.PI / 2;
      body.position.y = 1.4;
      g.add(body);
      // 阴极色环（稳压管银灰 / 肖特基双白环 / 普通二极管白）
      if (comp.type === 'schottky') {
        for (const dx of [1.2, 2.1]) {
          const band = new THREE.Mesh(GEO.cyl, MAT.whitePlastic);
          band.scale.set(1.1, 0.55, 1.1);
          band.rotation.z = Math.PI / 2;
          band.position.set(dx, 1.4, 0);
          g.add(band);
        }
      } else {
        const band = new THREE.Mesh(GEO.cyl, comp.type === 'zener' ? MAT.silver : MAT.whitePlastic);
        band.scale.set(1.1, 0.9, 1.1);
        band.rotation.z = Math.PI / 2;
        band.position.set(1.7, 1.4, 0);
        g.add(band);
      }
      g.add(leadBetween(MAT.lead, new THREE.Vector3(-2.2, 1.4, 0), new THREE.Vector3(-5.08, 0.15, 0), 0.28));
      g.add(leadBetween(MAT.lead, new THREE.Vector3(2.2, 1.4, 0), new THREE.Vector3(5.08, 0.15, 0), 0.28));
      break;
    }
    case 'ldr': {
      // 光敏电阻：陶瓷圆盘 + 顶面蛇形电极（红色圆片示意）+ 两根直插引脚
      g.add(cylY(MAT.ceramic, 2.6, 1.6, 0, 1.6, 0));
      g.add(cylY(std('#8B3A2E', 0.55, 0.15), 2.0, 0.35, 0, 2.55, 0));
      g.add(box(MAT.silver, 3.4, 0.12, 0.35, 0, 2.78, 0));
      g.add(box(MAT.silver, 0.35, 0.12, 3.4, 0, 2.78, 0));
      g.add(pin(-2.54, 0, 1.2), pin(2.54, 0, 1.2));
      break;
    }
    case 'thermistor': {
      // NTC 玻璃珠：水滴状玻璃壳 + 长引脚
      const bead = new THREE.Mesh(GEO.dome, MAT.glass);
      bead.scale.setScalar(1.3);
      bead.position.y = 1.7;
      g.add(bead);
      const beadLow = new THREE.Mesh(GEO.cyl, MAT.glass);
      beadLow.scale.set(1.3, 0.9, 1.3);
      beadLow.position.y = 1.25;
      g.add(beadLow);
      const core = cylY(MAT.copper, 0.55, 0.9, 0, 1.7, 0);
      g.add(core);
      g.add(leadBetween(MAT.lead, new THREE.Vector3(-0.8, 1.2, 0), new THREE.Vector3(-5.08, 0.15, 0), 0.26));
      g.add(leadBetween(MAT.lead, new THREE.Vector3(0.8, 1.2, 0), new THREE.Vector3(5.08, 0.15, 0), 0.26));
      break;
    }
    case 'ic':
    case 'opamp': {
      // DIP-8：黑色封装 + 两侧银色引脚排
      g.add(box(MAT.black, 9.6, 3, 6, 0, 1.7, 0));
      g.add(cylY(MAT.blackFlat, 0.7, 0.15, -3.5, 3.25, -1.8)); // 1 脚标记点
      for (let i = 0; i < 4; i++) {
        const x = -3.75 + i * 2.5;
        g.add(box(MAT.silver, 1.2, 0.35, 1.6, x, 0.5, 3.4));
        g.add(box(MAT.silver, 1.2, 0.35, 1.6, x, 0.5, -3.4));
      }
      break;
    }
    case 'mcu': {
      // QFP 大方块 + 四边引脚
      g.add(box(MAT.black, 11, 2.4, 11, 0, 1.4, 0));
      g.add(cylY(MAT.whitePlastic, 0.8, 0.12, -3.8, 2.65, -3.8));
      for (let i = 0; i < 4; i++) {
        const t = -3.9 + i * 2.6;
        g.add(box(MAT.silver, 1.3, 0.3, 1.4, t, 0.45, 6.1));
        g.add(box(MAT.silver, 1.3, 0.3, 1.4, t, 0.45, -6.1));
        g.add(box(MAT.silver, 1.4, 0.3, 1.3, 6.1, 0.45, t));
        g.add(box(MAT.silver, 1.4, 0.3, 1.3, -6.1, 0.45, t));
      }
      break;
    }
    case 'module': {
      // RF 模块：黑色基板 + 银色屏蔽罩
      g.add(box(MAT.blackFlat, 12, 0.8, 9, 0, 0.5, 0));
      g.add(box(MAT.silver, 9.5, 2.2, 7, 0.5, 2, 0));
      g.add(box(MAT.gold, 1.6, 0.5, 1.6, -4.8, 1.2, 0)); // 天线馈点
      g.add(smdPin(-5.6, -3), smdPin(-5.6, 3), smdPin(5.6, -3), smdPin(5.6, 3));
      break;
    }
    case 'battery':
    case 'vsrc': {
      // 9V 电池：深绿壳体 + 顶部电极盖
      g.add(box(MAT.battBody, 10, 5.6, 6.4, 0, 2.8, 0));
      g.add(box(MAT.battTop, 9.6, 0.8, 6, 0, 5.9, 0));
      g.add(cylY(MAT.silver, 1.2, 0.7, -2.5, 6.6, 0)); // 正极（大）
      g.add(cylY(MAT.silver, 0.8, 0.9, 2.5, 6.7, 0)); // 负极（小）
      g.add(box(MAT.copper, 6, 1.6, 0.15, 0, 3, 3.25)); // 侧面铜色标签条
      break;
    }
    case 'crystal': {
      // 银色椭圆金属罐（卧式压扁圆柱）
      const can = new THREE.Mesh(GEO.cyl, MAT.silver);
      can.scale.set(2, 8.4, 1.1);
      can.rotation.z = Math.PI / 2;
      can.position.y = 1.35;
      g.add(can);
      g.add(pin(-3.5, 0, 1), pin(3.5, 0, 1));
      break;
    }
    case 'switch': {
      g.add(box(MAT.blackFlat, 7, 1.6, 5, 0, 0.8, 0));
      const lever = box(MAT.silver, 4.6, 0.5, 2.2, 0, 2.1, 0);
      lever.rotation.z = comp.params?.closed === true ? 0 : -0.35;
      g.add(lever);
      g.add(pin(-2.54, 0, 0.9), pin(2.54, 0, 0.9));
      break;
    }
    case 'button': {
      g.add(box(MAT.blackFlat, 6, 1.8, 6, 0, 0.9, 0));
      const cap = cylY(comp.params?.closed === true ? MAT.gold : MAT.redPlastic, 1.7, 0.9, 0, 2.2, 0);
      g.add(cap);
      g.add(pin(-2.54, -1.5, 0.9), pin(2.54, 1.5, 0.9));
      break;
    }
    case 'antenna': {
      // 金色螺旋天线（TubeGeometry 沿螺旋曲线，非共享几何）
      const pts: THREE.Vector3[] = [];
      const turns = 6, r = 1.3, h = 9;
      for (let i = 0; i <= turns * 10; i++) {
        const t = (i / 10 / turns) * Math.PI * 2 * turns;
        pts.push(new THREE.Vector3(Math.cos(t) * r, 0.4 + (i / (turns * 10)) * h, Math.sin(t) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.26, 6, false);
      disposables.push(tubeGeo);
      g.add(new THREE.Mesh(tubeGeo, MAT.gold));
      g.add(cylY(MAT.gold, 1.5, 0.4, 0, 0.2, 0)); // 底座焊盘
      break;
    }
    case 'npn':
    case 'nmos':
    case 'pmos': {
      // TO-92：黑色半圆柱 + 三根引脚
      const body = new THREE.Mesh(GEO.cyl, MAT.black);
      body.scale.set(2.2, 3.4, 1.2);
      body.position.y = 1.9;
      g.add(body);
      g.add(box(MAT.black, 4.4, 3.4, 0.6, 0, 1.9, -0.9)); // 平背面
      g.add(pin(-1.27, 0.8, 1), pin(0, 0.8, 1), pin(1.27, 0.8, 1));
      break;
    }
    case 'fuse': {
      // 玻璃管保险丝 + 金属帽
      const tube = new THREE.Mesh(GEO.cyl, MAT.glass);
      tube.scale.set(1.1, 4.6, 1.1);
      tube.rotation.z = Math.PI / 2;
      tube.position.y = 1.5;
      g.add(tube);
      for (const dx of [-2, 2]) {
        const cap = new THREE.Mesh(GEO.cyl, MAT.silver);
        cap.scale.set(1.2, 1, 1.2);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(dx, 1.5, 0);
        g.add(cap);
      }
      const filament = leadBetween(MAT.copper, new THREE.Vector3(-2, 1.5, 0), new THREE.Vector3(2, 1.5, 0), 0.12);
      g.add(filament);
      g.add(leadBetween(MAT.lead, new THREE.Vector3(-2.5, 1.5, 0), new THREE.Vector3(-5.08, 0.15, 0), 0.3));
      g.add(leadBetween(MAT.lead, new THREE.Vector3(2.5, 1.5, 0), new THREE.Vector3(5.08, 0.15, 0), 0.3));
      break;
    }
    case 'funcgen': {
      // BNC 插座：金属圆座 + 中心孔
      g.add(cylY(MAT.silver, 2.6, 2.4, 0, 1.2, 0));
      g.add(cylY(MAT.blackFlat, 1.1, 0.5, 0, 2.6, 0));
      g.add(cylY(MAT.gold, 0.35, 0.8, 0, 2.7, 0));
      break;
    }
    case 'voltmeter':
    case 'ammeter': {
      // 圆桶表头：黑壳 + 丝印白表盘
      g.add(cylY(MAT.black, 4, 2.6, 0, 1.3, 0));
      g.add(cylY(MAT.whitePlastic, 3.6, 0.25, 0, 2.7, 0));
      const needle = box(comp.type === 'voltmeter' ? MAT.redPlastic : MAT.silver, 2.6, 0.08, 0.3, 0.6, 2.85, 0);
      needle.rotation.y = comp.type === 'voltmeter' ? -0.5 : 0.4;
      g.add(needle);
      g.add(pin(-2.54, 0, 0.9), pin(2.54, 0, 0.9));
      break;
    }
    case 'sensor': {
      // 传感器：黑色小方块 + 银色感应窗
      g.add(box(MAT.sensor, 5.5, 2.6, 5.5, 0, 1.3, 0));
      g.add(cylY(MAT.silver, 1.6, 0.3, 0, 2.75, 0));
      g.add(cylY(MAT.blackFlat, 1.1, 0.35, 0, 2.8, 0));
      g.add(pin(-1.27, 1.8, 1), pin(1.27, 1.8, 1), pin(0, -1.8, 1));
      break;
    }
    case 'gnd': {
      // 接地测试点：金色圆桩
      g.add(cylY(MAT.gold, 1.6, 0.35, 0, 0.18, 0));
      g.add(cylY(MAT.gold, 0.5, 2.2, 0, 1.3, 0));
      const loop = new THREE.Mesh(GEO.torus, MAT.gold);
      loop.scale.setScalar(0.7);
      loop.rotation.x = Math.PI / 2;
      loop.position.y = 2.6;
      g.add(loop);
      break;
    }
    case 'buzzer': {
      // 有源蜂鸣器：黑色圆柱腔体 + 顶部中心小孔
      g.add(cylY(MAT.black, 4.2, 5.2, 0, 2.6, 0));
      g.add(cylY(MAT.blackFlat, 4.05, 0.3, 0, 5.3, 0));
      g.add(cylY(MAT.blackFlat, 0.55, 0.25, 0, 5.5, 0));
      g.add(pin(-2.54, 1.27, 1), pin(2.54, -1.27, 1));
      break;
    }
    case 'speaker': {
      // 扬声器：盆架 + 纸盆锥（非共享几何）+ 磁缸
      g.add(cylY(MAT.blackFlat, 4.9, 1.4, 0, 0.7, 0)); // 盆架底环
      const coneGeo = new THREE.CylinderGeometry(1.7, 4.6, 2.2, 24);
      coneGeo.translate(0, 2.6, 0);
      disposables.push(coneGeo);
      g.add(new THREE.Mesh(coneGeo, MAT.whitePlastic)); // 纸盆（上小下大）
      g.add(cylY(MAT.silver, 1.8, 1.3, 0, 4.2, 0)); // 磁路钢缸
      g.add(pin(-3.8, 0.8, 0.9), pin(3.8, 0.8, 0.9));
      break;
    }
    case 'transformer': {
      // 变压器：EI 铁芯方体 + 中缝叠片 + 绕组压条 + 四根引脚
      g.add(box(std('#264A66', 0.5, 0.35), 8.5, 6, 6.4, 0, 3.2, 0)); // 浸漆铁芯叠厚
      g.add(box(MAT.ferrite, 1.1, 6.4, 6.8, 0, 3.2, 0)); // 中缝可见铁芯
      for (const dz of [-2.2, 2.2]) {
        g.add(box(MAT.copper, 6.5, 0.35, 1.4, 0, 6.35, dz)); // 绕组压条示意
      }
      g.add(pin(-2.54, -2.54, 1), pin(-2.54, 2.54, 1), pin(2.54, -2.54, 1), pin(2.54, 2.54, 1));
      break;
    }
  }
  g.traverse(o => { o.matrixAutoUpdate = true; });
  return g;
}

/** 释放元件组中的非共享资源（LED 材质、天线几何体） */
export function disposeComponent(g: THREE.Group): void {
  const ledMat = g.userData.ledMat as THREE.MeshStandardMaterial | undefined;
  if (ledMat) ledMat.dispose();
  const disposables = g.userData.disposables as THREE.BufferGeometry[] | undefined;
  if (disposables) for (const d of disposables) d.dispose();
}
