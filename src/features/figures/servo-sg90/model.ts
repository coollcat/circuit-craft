// SG90 舵机 —— 纯物理/协议模型（站点组件、离线预览、图鉴实验共用同一份真相）
// 口径取自 SG90 的公开规格，并刻意与站点关卡引擎的单位习惯保持一致：
//  • 控制信号：50Hz（周期 20ms）PWM，脉宽 0.5ms→0°、1.5ms→90°、2.5ms→180°
//  • 工作电压 4.8~6V；空载电流 ~10mA，转动 ~200mA，堵转 ~700mA
//  • 堵转扭矩 1.8 kg·cm @4.8V；速度 0.1s/60°（≈0.6s 走完 180°）
export const PWM_FREQ_HZ = 50;
export const PERIOD_MS = 1000 / PWM_FREQ_HZ; // 20ms
export const PULSE_MIN_MS = 0.5;
export const PULSE_MAX_MS = 2.5;
export const ANGLE_SPAN = 180;

export const STALL_CURRENT_A = 0.7;
export const MOVE_CURRENT_A = 0.2;
export const IDLE_CURRENT_A = 0.01;
export const STALL_TORQUE_KGCM = 1.8;
export const SPEED_S_PER_60DEG = 0.1;

/** 旋钮可调范围：比工作区间略宽，用来演示"超出范围会堵转" */
export const PULSE_KNOB_MIN_MS = 0.3;
export const PULSE_KNOB_MAX_MS = 2.7;
export const PULSE_STEP_MS = 0.02;

export interface ServoState {
  /** 脉宽 ms */
  pulseMs: number;
  /** 占空比 % */
  duty: number;
  /** 目标角度 0~180° */
  angle: number;
  /** 脉宽在工作区间内 */
  inRange: boolean;
  /** 超出工作区间 → 顶到机械极限、嗡嗡响、电流飙升 */
  stalled: boolean;
  /** 当前电流 A（堵转 / 转动 / 空载） */
  current: number;
  /** 该角度下可用的扭矩余量 kg·cm */
  torque: number;
  /** 结果转动耗时 s（按 0.1s/60° 估算的全程时间） */
  travel: number;
  verdict: string;
}

export function clampPulse(pulseMs: number): number {
  return Math.max(PULSE_KNOB_MIN_MS, Math.min(PULSE_KNOB_MAX_MS, pulseMs));
}

/** 脉宽 → 角度：工作区间内线性映射，超出则顶到 0/180 并判定堵转 */
export function angleOf(pulseMs: number): number {
  const raw = ((pulseMs - PULSE_MIN_MS) / (PULSE_MAX_MS - PULSE_MIN_MS)) * ANGLE_SPAN;
  return Math.max(0, Math.min(ANGLE_SPAN, raw));
}

export function servoState(pulseMs: number, moved = false): ServoState {
  const pulse = clampPulse(pulseMs);
  const inRange = pulse >= PULSE_MIN_MS && pulse <= PULSE_MAX_MS;
  const angle = angleOf(pulse);
  const duty = (pulse / PERIOD_MS) * 100;
  const stalled = !inRange;
  const current = stalled ? STALL_CURRENT_A : moved ? MOVE_CURRENT_A : IDLE_CURRENT_A;
  return {
    pulseMs: pulse,
    duty,
    angle,
    inRange,
    stalled,
    current,
    torque: STALL_TORQUE_KGCM,
    travel: (angle / 60) * SPEED_S_PER_60DEG,
    verdict: stalled
      ? `脉宽 ${pulse.toFixed(2)}ms 超出 0.5~2.5ms：舵机顶到机械限位，嗡嗡响、电流升到 ${(STALL_CURRENT_A * 1000).toFixed(0)}mA`
      : Math.abs(angle - 90) < 1
        ? `脉宽 ${pulse.toFixed(2)}ms = 中位，舵机停在 ${angle.toFixed(0)}°`
        : `脉宽 ${pulse.toFixed(2)}ms → ${angle.toFixed(0)}°，全程约 ${((ANGLE_SPAN / 60) * SPEED_S_PER_60DEG).toFixed(1)}s 走完 180°`,
  };
}

/** 舵机输出轴的世界角度（度）：90° 时手臂指向 +x，0°/+180° 分别指向 +y/−y */
export function hornAngle(angle: number): number {
  return 90 - angle;
}

/** 画 PWM 波形用：一个周期内的采样点（0..1 的相位 → 高/低电平） */
export function pwmLevel(phase: number, pulseMs: number): 0 | 1 {
  return phase * PERIOD_MS <= pulseMs ? 1 : 0;
}
