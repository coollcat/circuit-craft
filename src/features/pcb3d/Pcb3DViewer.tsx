// 3D PCB 预览器 —— React 包装层（懒加载使用：React.lazy(() => import(...))）
// 职责：挂载/销毁 PcbScene，跟随 circuit 增量重建，透传支路电流驱动 LED 发光。
// 空电路时显示引导文案，不创建 WebGL 上下文。
import { useEffect, useRef } from 'react';
import type { CircuitSpec } from '@/engine/types';
import { PcbScene } from './PcbScene';
import { cn } from '@/lib/utils';

export interface Pcb3DViewerProps {
  circuit: CircuitSpec;
  /** 支路电流（A），可选；传入后 LED 按电流发光、走线微光 */
  currents?: Map<string, number> | null;
  className?: string;
  /** 空电路引导文案 */
  emptyHint?: string;
}

export default function Pcb3DViewer({ circuit, currents, className, emptyHint }: Pcb3DViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PcbScene | null>(null);
  const hasCircuit = circuit.components.length > 0;

  // 挂载 / 卸载场景（空电路不建 WebGL 上下文）
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !hasCircuit) return;
    const scene = new PcbScene(host);
    sceneRef.current = scene;
    scene.setCircuit(circuit);
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 场景只在空/非空切换时重建，电路内容由下方 effect 增量同步
  }, [hasCircuit]);

  // 电路变化 → 增量重建
  useEffect(() => {
    sceneRef.current?.setCircuit(circuit);
  }, [circuit]);

  // 电流数据 → 发光更新（不触发重建）
  useEffect(() => {
    sceneRef.current?.setCurrents(currents ?? null);
  }, [currents]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-ink-950', className)}>
      {hasCircuit ? (
        <>
          <div ref={hostRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] tracking-[0.25em] text-silk-700">
            3D PCB · 拖拽旋转 / 滚轮缩放 / Shift+拖拽平移 / 双击复位
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="font-mono text-xs tracking-[0.3em] text-silk-700">3D PCB PREVIEW</div>
          <p className="text-sm text-silk-500">
            {emptyHint ?? '画布还是空的——先放一个元件，这里就会长出一块真的电路板。'}
          </p>
        </div>
      )}
    </div>
  );
}
