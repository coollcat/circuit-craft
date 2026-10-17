// 短暂状态统一 hook：toast 提示 / 焊盘抖动等「亮一下就消失」的 UI 状态。
// 章节地图与支线页原先各写一份 useState + setTimeout（时长还各不相同），
// 这里收敛成一处，默认停留时长全站一致。
import { useEffect, useState } from 'react';

/** toast / 底部提示条的默认停留时长（ms） */
export const TOAST_MS = 2600;
/** 焊盘抖动等一次性反馈时长（ms） */
export const SHAKE_MS = 400;

export function useTransient<T>(timeout: number = TOAST_MS) {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (value === null) return;
    const t = setTimeout(() => setValue(null), timeout);
    return () => clearTimeout(t);
  }, [value, timeout]);
  return [value, setValue] as const;
}
