// 站点级「动效是否开启」判定：设置里的动效开关 ∧ 系统 prefers-reduced-motion。
//
// 为什么不能只靠 <MotionConfig reducedMotion="user">：
//   - framer-motion 的 reducedMotion 只降级 transform / layout 动画，
//     opacity、boxShadow 之类的循环（如焊盘脉冲环）仍会一直跑；
//   - SMIL（<animate>/<animateMotion>/<animateTransform>）和 CSS @keyframes
//     完全不走 JS 动画管线，必须显式判断。
// 所以循环动画统一读这个 hook；CSS 动画另有 index.css 的 html[data-motion='off'] 兜底。
import { useReducedMotion } from 'framer-motion';
import { useProgress } from '@/store/progress';

export function useMotionOn(): boolean {
  const settingOn = useProgress(s => s.settings.motion);
  const systemReduced = useReducedMotion();
  return settingOn && !systemReduced;
}
