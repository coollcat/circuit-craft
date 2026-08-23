// 图鉴 3D —— 旁标注释数据
// anchor 为元件模型局部坐标（mm）：x 沿模型横轴，y 向上，z 朝前；
// 与 features/pcb3d/models.ts 各分支及 codex3d/extras.ts 重建模型的几何尺寸一一对应。
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
  vsrc: [
    { text: '正极帽（粗）', anchor: [-2.5, 7.0, 0] },
    { text: '负极帽（细）', anchor: [2.5, 7.2, 0] },
    { text: '9V 方电池造型', anchor: [0, 3, 3.35] },
  ],
  battery: [
    { text: '正极帽（大）', anchor: [-2.5, 7.0, 0] },
    { text: '负极帽（小）', anchor: [2.5, 7.2, 0] },
    { text: '外壳标签条', anchor: [0, 3, 3.35] },
  ],
  gnd: [
    { text: '金色接地桩', anchor: [0, 1.3, 0.55] },
    { text: '测试环（夹表笔/鳄鱼夹）', anchor: [0, 2.6, 0] },
  ],
  voltmeter: [
    { text: '白色表盘', anchor: [0, 2.9, 0] },
    { text: '指针（并联测电压）', anchor: [1.5, 2.95, 0.5] },
    { text: '两表笔引脚', anchor: [-2.54, 0.5, 0] },
  ],
  ammeter: [
    { text: '白色表盘', anchor: [0, 2.9, 0] },
    { text: '指针（串联测电流）', anchor: [-1.5, 2.95, 0.5] },
    { text: '两表笔引脚', anchor: [2.54, 0.5, 0] },
  ],
  funcgen: [
    { text: 'BNC 卡口座', anchor: [0, 1.5, 2.6] },
    { text: '黑色绝缘环', anchor: [0, 2.6, 1.1] },
    { text: '中心信号针', anchor: [0, 3.2, 0] },
  ],
  sensor: [
    { text: '银色感应窗', anchor: [0, 3.05, 0] },
    { text: '黑色壳体', anchor: [1.8, 1.4, 2.78] },
    { text: '三引脚：VCC·GND·OUT', anchor: [0, 0.6, -1.8] },
  ],
  mcu: [
    { text: 'pin1 白点标记', anchor: [-3.8, 2.8, -3.8] },
    { text: 'QFP 贴片本体', anchor: [2.2, 2.6, 0] },
    { text: '四边翼形引脚', anchor: [3.9, 0.55, 6.1] },
  ],
  ic: [
    { text: '圆点 = 1 脚', anchor: [-3.5, 3.5, -1.8] },
    { text: 'DIP-8 封装顶面', anchor: [2, 3.4, 0] },
    { text: '两侧各 4 引脚', anchor: [1, 0.6, 3.4] },
  ],
  timer555: [
    { text: '圆点 = 1 脚（GND）', anchor: [-3.5, 3.5, -1.8] },
    { text: 'DIP-8 封装顶面', anchor: [2, 3.4, 0] },
    { text: '逆时针数到 8 = VCC', anchor: [1, 0.6, 3.4] },
  ],
  module: [
    { text: '金属屏蔽罩', anchor: [0.5, 3.3, 0] },
    { text: '天线馈点', anchor: [-4.8, 1.6, 0] },
    { text: '邮票边焊盘', anchor: [5.6, 0.7, 3] },
  ],
  ldr: [
    { text: '蛇形电极（受光面）', anchor: [0, 2.95, 0.5] },
    { text: '红色光敏层', anchor: [0, 2.55, -1.9] },
    { text: '陶瓷基座', anchor: [0, 1.6, 2.6] },
    { text: '脚距 10.16mm', anchor: [-5.08, 0.5, 0] },
  ],
  thermistor: [
    { text: '玻璃珠外壳', anchor: [0, 2.4, 1.2] },
    { text: '铜芯感温元件', anchor: [0, 2.1, 0] },
    { text: '长引脚（无极性）', anchor: [-5.08, 0.5, 0] },
  ],
  buzzer: [
    { text: '中心发音孔', anchor: [0, 5.75, 0] },
    { text: '腔体侧壁', anchor: [0, 3, 4.2] },
    { text: '两引脚：长脚为正', anchor: [5.08, 0.6, 0] },
  ],
  schottky: [
    { text: '双白环 = 阴极', anchor: [1.65, 2.6, 0.4] },
    { text: '低压降 ≈ 0.3V', anchor: [-1.2, 2.55, 0.4] },
    { text: '轴向引脚', anchor: [-5.08, 0.5, 0] },
  ],
  ldo7805: [
    { text: '金属散热片 + 安装孔', anchor: [0, 9.3, -0.15] },
    { text: '丝印 L7805CV 本体', anchor: [1.6, 4.2, 1.6] },
    { text: 'IN · GND · OUT 三直脚', anchor: [1.8, 0.7, 0.5] },
  ],
  seg7: [
    { text: '七段红色数码', anchor: [0, 2.9, 3.4] },
    { text: '小数点 DP', anchor: [1.75, 0.98, 3.4] },
    { text: '环氧底座', anchor: [-3.4, 4.6, 3.3] },
    { text: '底部引脚', anchor: [1.3, 0.5, 2.3] },
  ],
  relay: [
    { text: '顶部丝印：线圈电压 / 触点容量', anchor: [-1, 11.7, 0] },
    { text: '蓝色塑封本体', anchor: [0, 7, 5.8] },
    { text: '线圈引脚 ×2', anchor: [-3.5, 0.6, -3] },
    { text: 'COM / NO / NC 触点引脚', anchor: [4.5, 0.6, 3] },
  ],
  dcmotor: [
    { text: '冲压钢壳（印额定电压）', anchor: [0, 8, 5.05] },
    { text: '输出转轴 φ2mm', anchor: [0, 15, 0] },
    { text: '电刷接线端子 ×2', anchor: [2.2, 1.4, 4.9] },
  ],
  servo: [
    { text: '输出轴 + 摇臂', anchor: [2.2, 15.3, 0] },
    { text: '安装耳', anchor: [8.6, 11, 0] },
    { text: '棕红橙三线束', anchor: [-9.6, 1, 0] },
    { text: 'SG90 主壳体', anchor: [0, 6, 5.8] },
  ],
  transformer: [
    { text: '中缝铁芯叠片', anchor: [0, 3.5, 3.42] },
    { text: '绕组压条示意', anchor: [2, 6.5, 2.2] },
    { text: '浸漆方壳', anchor: [-2.8, 3.4, 3.2] },
    { text: '四引脚对齐焊盘', anchor: [5.08, 0.6, 2.54] },
  ],
  speaker: [
    { text: '锥形纸盆', anchor: [0, 3.2, 2.8] },
    { text: '磁路钢缸', anchor: [0, 4.3, 1.8] },
    { text: '盆架环', anchor: [0, 0.9, 4.9] },
    { text: '两接线引脚', anchor: [-5.08, 0.5, 0] },
  ],
};

/** 取条目标注（无模型映射的兜底条目返回空数组） */
export function annotationsFor(entryId: string): AnnotationDef[] {
  return ANNOTATIONS[entryId] ?? [];
}
