// 图鉴 3D —— 非 ComponentType 条目的实物重建模型（relay/dcmotor/servo/seg7/ldo7805）
// 这些条目不进仿真、不在 engine/types 的 ComponentType 里，pcb3d 工厂没有对应分支，
// 因此在 codex3d 层按实物造型独立建模。资源释放契约与 pcb3d/buildComponent 对齐：
// userData.disposables（非共享几何）由 disposeComponent 释放；
// userData.studioMats（实例材质）由 StudioScene.disposeGroup 释放。
import * as THREE from 'three';

export type ExtraModelKind = 'relay' | 'dcmotor' | 'servo' | 'seg7' | 'ldo7805';

/* ---------------- 构建器：自动登记几何体与材质 ---------------- */
class Builder {
  private geos: THREE.BufferGeometry[] = [];
  private mats: THREE.Material[] = [];
  readonly group = new THREE.Group();

  mat(color: string, roughness: number, metalness: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.mats.push(m);
    return m;
  }
  rawMat(m: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    this.mats.push(m);
    return m;
  }
  box(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }
  cylY(mat: THREE.Material, r: number, h: number, x = 0, y = 0, z = 0): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(r, r, h, 20);
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }
  /** 圆环默认孔轴沿 z（如 TO-220 安装孔）；需其他朝向自行旋转返回值 */
  torus(mat: THREE.Material, r: number, tube: number, x: number, y: number, z: number): THREE.Mesh {
    const geo = new THREE.TorusGeometry(r, tube, 10, 24);
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], radius: number): THREE.Mesh {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, radius, 6, false);
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    this.group.add(m);
    return m;
  }
  finish(): THREE.Group {
    this.group.userData.disposables = this.geos;
    this.group.userData.studioMats = this.mats;
    return this.group;
  }
}

/* ---------------- 继电器：SRD 蓝色塑封方块 + 5 扁脚 ---------------- */
function buildRelay(): THREE.Group {
  const b = new Builder();
  const blue = b.mat('#2456C8', 0.55, 0.15);
  const silver = b.mat('#C7CCD2', 0.3, 0.95);
  const label = b.mat('#E8E6DF', 0.65, 0.02);
  b.box(blue, 15, 10.5, 11.5, 0, 6.25, 0); // 塑封本体（底面离板 1mm）
  b.box(label, 9.5, 0.14, 6.4, -1, 11.57, 0); // 顶部丝印区
  // 5 引脚：左线圈 ×2，右 COM/NO/NC ×3
  const pins: Array<[number, number]> = [
    [-3.5, -3], [-3.5, 3],
    [4.5, -3], [4.5, 0], [4.5, 3],
  ];
  for (const [x, z] of pins) b.box(silver, 0.85, 1.0, 0.4, x, 0.5, z);
  return b.finish();
}

/* ---------------- 直流电机：130 小马达（钢壳立式 + 转轴 + 两端子） ---------------- */
function buildDcMotor(): THREE.Group {
  const b = new Builder();
  const silver = b.mat('#C7CCD2', 0.28, 0.95);
  const black = b.mat('#14171A', 0.8, 0.05);
  const gold = b.mat('#F0C078', 0.3, 0.95);
  const band = b.mat('#B8893E', 0.6, 0.35);
  b.cylY(black, 5, 1.6, 0, 0.8, 0); // 电刷端盖
  b.cylY(silver, 5, 11.5, 0, 7.35, 0); // 冲压钢壳
  b.cylY(band, 5.06, 3.2, 0, 7.35, 0); // 印字色环
  b.cylY(silver, 0.65, 2.8, 0, 14.5, 0); // 输出转轴 φ2mm
  for (const dx of [-2.2, 2.2]) b.box(gold, 0.75, 2.6, 0.4, dx, 1.4, 4.7); // 接线端子
  return b.finish();
}

/* ---------------- 舵机：SG90 蓝色方块 + 输出摇臂 + 三色线束 ---------------- */
function buildServo(): THREE.Group {
  const b = new Builder();
  const blue = b.mat('#2A5CC8', 0.55, 0.15);
  const white = b.mat('#F2EFE6', 0.6, 0.03);
  const wireBrown = b.mat('#6B4423', 0.7, 0.05);
  const wireRed = b.mat('#C0392B', 0.7, 0.05);
  const wireOrange = b.mat('#E67E22', 0.7, 0.05);
  b.box(blue, 12.4, 10, 11.5, 0, 6, 0); // 主壳体
  b.box(blue, 18.6, 1.1, 5.6, 0, 10.95, 0); // 安装耳
  b.cylY(blue, 3, 2, 0, 12.5, 0); // 轴座鼓包
  b.cylY(white, 1.7, 1.2, 0, 14.1, 0); // 输出轴
  b.cylY(white, 1.2, 0.55, 0, 14.97, 0); // 摇臂毂
  b.box(white, 5.8, 0.5, 1.4, 2.2, 15.2, 0); // 摇臂
  const wires: Array<[THREE.MeshStandardMaterial, number]> = [
    [wireBrown, -0.72],
    [wireRed, 0],
    [wireOrange, 0.72],
  ];
  for (const [mat, dz] of wires) {
    b.tube(mat, [
      new THREE.Vector3(-6.0, 3.2, dz),
      new THREE.Vector3(-8.4, 2.2, dz),
      new THREE.Vector3(-10.2, 0.4, dz),
    ], 0.34);
  }
  return b.finish();
}

/* ---------------- 数码管：一位 8 字（七段 + DP，前脸朝 +z） ---------------- */
function buildSeg7(): THREE.Group {
  const b = new Builder();
  const black = b.mat('#14171A', 0.8, 0.05);
  const silver = b.mat('#C7CCD2', 0.3, 0.95);
  const red = b.rawMat(new THREE.MeshStandardMaterial({
    color: '#C93A30', roughness: 0.4, metalness: 0,
    transparent: true, opacity: 0.92,
    emissive: '#FF2D20', emissiveIntensity: 0.28,
  }));
  b.box(black, 11, 5, 6.5, 0, 2.9, 0); // 环氧底座
  for (const [, y] of [[0, 4.45], [0, 2.9], [0, 1.35]] as Array<[number, number]>) {
    b.box(red, 2.5, 0.72, 0.18, 0, y, 3.28); // a / g / d 横段
  }
  for (const [x, y] of [[-1.08, 3.68], [1.08, 3.68], [-1.08, 2.12], [1.08, 2.12]] as Array<[number, number]>) {
    b.box(red, 0.72, 1.85, 0.18, x, y, 3.28); // f / b / e / c 竖段
  }
  b.box(red, 0.62, 0.62, 0.18, 1.75, 0.98, 3.28); // 小数点
  for (let i = -2; i <= 2; i++) b.box(silver, 0.55, 1.0, 0.4, i * 1.3, 0.5, 2.2); // 底排引脚
  return b.finish();
}

/* ---------------- 线性稳压器：TO-220（黑塑本体 + 散热 tab 安装孔 + 三直脚） ---------------- */
function buildLdo7805(): THREE.Group {
  const b = new Builder();
  const black = b.mat('#1B1E22', 0.55, 0.15);
  const silver = b.mat('#C7CCD2', 0.28, 0.95);
  const lead = b.mat('#AAB2BC', 0.35, 0.9);
  const holeRing = b.mat('#8F979E', 0.4, 0.8);
  b.box(black, 5.2, 5.4, 2.4, 0, 4.1, 0.35); // 塑封本体
  b.box(silver, 5.2, 3.8, 1.1, 0, 8.7, -0.15); // 金属散热片
  b.torus(holeRing, 0.85, 0.26, 0, 9.3, -0.15); // 安装孔
  for (const x of [-1.8, 0, 1.8]) b.box(lead, 0.62, 1.5, 0.32, x, 0.75, 0.5); // IN/GND/OUT
  return b.finish();
}

const BUILDERS: Record<ExtraModelKind, () => THREE.Group> = {
  relay: buildRelay,
  dcmotor: buildDcMotor,
  servo: buildServo,
  seg7: buildSeg7,
  ldo7805: buildLdo7805,
};

/** 由 extra 类型 token 构建实物模型组（含 disposables / studioMats 元数据） */
export function buildExtraModel(kind: ExtraModelKind): THREE.Group {
  return BUILDERS[kind]();
}
