// 图鉴 3D —— 旁标注释数据
// anchor 为元件模型局部坐标（mm）：x 沿模型横轴，y 向上，z 朝前；
// 与 features/pcb3d/models.ts 中各模型的几何尺寸一一对应（模型原点即组原点）。
export interface AnnotationDef {
  /** 标注文字（丝印短句） */
  text: string;
  /** 指向元件部位的 3D 锚点 [x, y, z]（mm） */
  anchor: [number, number, number];
}

/** 条目 id → 标注列表（每条目 2~4 个） */
export const ANNOTATIONS: Record<string, AnnotationDef[]> = {
  resistor: [
    { text: '色环：从这一端读起', anchor: [1.5, 2.6, 0.4] },
    { text: '金环 = 误差 ±5%', anchor: [-1.9, 2.6, 0.4] },
    { text: '轴向直插引脚', anchor: [5.08, 0.5, 0] },
  ],
  capacitor: [
    { text: '顶部防爆纹（十字刻痕）', anchor: [0, 5.2, 0] },
    { text: '负极白条', anchor: [-1.7, 3.0, 1.3] },
    { text: '引脚：长正短负', anchor: [1.27, 0.6, 0] },
  ],
  inductor: [
    { text: '铜线圈', anchor: [0, 3.3, 0] },
    { text: '铁氧体磁芯', anchor: [-2.4, 2.3, 0.7] },
    { text: '轴向直插引脚', anchor: [5.08, 0.5, 0] },
  ],
  crystal: [
    { text: '金属屏蔽壳（常接地）', anchor: [0, 2.6, 0] },
    { text: '两引脚，无方向', anchor: [3.5, 0.5, 0] },
  ],
  diode: [
    { text: '阴极色环 = 原理图横杠端', anchor: [1.7, 2.7, 0.4] },
    { text: 'DO-41 塑封本体', anchor: [-1.2, 2.6, 0.4] },
    { text: '轴向引脚', anchor: [-5.08, 0.5, 0] },
  ],
  led: [
    { text: '环氧树脂透镜', anchor: [0, 4.3, 0.5] },
    { text: '长脚 = 正极（阳极）', anchor: [-1.27, 0.7, 0] },
    { text: '短脚 = 负极（平口边）', anchor: [1.27, 0.5, 0] },
  ],
  zener: [
    { text: '阴极标记（银灰环）', anchor: [1.7, 2.7, 0.4] },
    { text: '反向接入使用', anchor: [-1.2, 2.6, 0.4] },
    { text: '轴向引脚', anchor: [-5.08, 0.5, 0] },
  ],
  npn: [
    { text: '平面丝印面（面向印字）', anchor: [0, 2.8, -1.3] },
    { text: 'TO-92 半圆本体', anchor: [0, 3.9, 0] },
    { text: 'E / B / C 三引脚', anchor: [0, 0.5, 0.9] },
  ],
  nmos: [
    { text: 'TO-92 小信号封装', anchor: [0, 3.9, 0] },
    { text: '平面丝印面', anchor: [0, 2.8, -1.3] },
    { text: 'G / D / S（顺序查手册）', anchor: [0, 0.5, 0.9] },
  ],
  pmos: [
    { text: '与 NMOS 同造型，角色相反', anchor: [0, 3.9, 0] },
    { text: '平面丝印面', anchor: [0, 2.8, -1.3] },
    { text: '高边开关：源极朝电源正', anchor: [0, 0.5, 0.9] },
  ],
  opamp: [
    { text: '圆点 / 缺口 = 1 脚', anchor: [-3.5, 3.7, -1.8] },
    { text: 'DIP-8 黑色环氧封装', anchor: [2.0, 3.5, 0] },
    { text: '两侧各 4 引脚', anchor: [1.0, 0.6, 3.4] },
  ],
  esp32: [
    { text: '金属屏蔽罩', anchor: [0.5, 3.4, 0] },
    { text: '天线馈点 → 蛇形天线区', anchor: [-4.8, 1.7, 0] },
    { text: '半孔邮票边焊盘', anchor: [5.6, 0.8, 3.0] },
  ],
  switch: [
    { text: '按键帽（红色）', anchor: [0, 3.1, 0] },
    { text: '6×6 轻触底座', anchor: [2.4, 1.6, 2.4] },
    { text: '四脚：两两内部相通', anchor: [2.54, 0.5, 1.5] },
  ],
  pot: [
    { text: '顶调螺丝（25 圈细调）', anchor: [0, 4.4, 0] },
    { text: '3296 蓝色本体', anchor: [0, 1.9, 3.6] },
    { text: '三引脚：两端 + 中点', anchor: [0, 0.5, -2.54] },
  ],
  fuse: [
    { text: '玻璃管', anchor: [0, 2.9, 0] },
    { text: '内部熔丝（过流熔断）', anchor: [-0.6, 1.5, 1.1] },
    { text: '金属帽（焊接端）', anchor: [2.0, 2.6, 0.5] },
  ],
  antenna: [
    { text: '螺旋天线（≈ λ/4）', anchor: [1.3, 6.2, 0] },
    { text: '底座馈电焊盘', anchor: [0, 0.6, 1.5] },
  ],
};

/** 取条目标注（无模型映射的兜底条目返回空数组） */
export function annotationsFor(entryId: string): AnnotationDef[] {
  return ANNOTATIONS[entryId] ?? [];
}
