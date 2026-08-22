// 编辑器 — 仿真驱动 hook：页面持有 CircuitSimulator，rAF 推进，10Hz 快照供 React UI
// Canvas 消费者（示波器/粒子）直接读 simRef 获得 60fps 数据。
import { useEffect, useRef, useState } from 'react';
import type { CircuitSpec } from '@/engine/types';
import { CircuitSimulator } from '@/engine/simulator';
import { maxFuncgenFreq } from '@/engine/solver';

export interface SimulationHandle {
  simRef: React.MutableRefObject<CircuitSimulator>;
  /** 每次快照递增（约 10Hz，运行时） */
  version: number;
  error: string | null;
}

function isDynamic(circuit: CircuitSpec): boolean {
  return circuit.components.some(c => ['capacitor', 'inductor', 'crystal', 'funcgen'].includes(c.type));
}

export function useSimulation(circuit: CircuitSpec, running: boolean): SimulationHandle {
  const simRef = useRef<CircuitSimulator>(new CircuitSimulator(circuit));
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(simRef.current.error);
  // 拖拽/微调时 circuit 引用每帧都变但内容不变 —— 用内容签名挡住无谓的仿真器重建
  const sigRef = useRef<string>(JSON.stringify(circuit));

  // 电路变化 → 重建仿真器
  useEffect(() => {
    const sig = JSON.stringify(circuit);
    if (sig === sigRef.current) return;
    sigRef.current = sig;
    const sim = new CircuitSimulator(circuit);
    simRef.current = sim;
    setError(sim.error);
    setVersion(v => v + 1);
  }, [circuit]);

  // 运行循环：自适应步数（目标每帧 ≤6ms 仿真耗时）
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let steps = isDynamic(circuit) ? 64 : 8;
    let lastUi = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const sim = simRef.current;
      const t0 = performance.now();
      sim.runSteps(steps);
      const cost = performance.now() - t0;
      if (cost > 8 && steps > 4) steps = Math.max(4, Math.floor(steps * 0.7));
      else if (cost < 3 && steps < 400) steps = Math.floor(steps * 1.25) + 1;
      if (sim.error) {
        setError(sim.error);
        return; // 暂停：求解器不收敛时绝不白屏
      }
      if (now - lastUi > 100) {
        lastUi = now;
        setVersion(v => v + 1);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, circuit]);

  // 停止时也清错误显示（电路没变但用户点了重置）
  useEffect(() => {
    if (!running) setError(simRef.current.error);
  }, [running, version]); // eslint-disable-line react-hooks/exhaustive-deps

  return { simRef, version, error };
}

/** 重置仿真（清空历史与烧毁状态，保留当前电路） */
export function resetSimulation(simRef: React.MutableRefObject<CircuitSimulator>) {
  simRef.current.reset(simRef.current.circuit);
}

/** 预估波形推荐时基（秒/格）：有 funcgen 时按周期，否则 1ms */
export function defaultTimebase(circuit: CircuitSpec): number {
  const f = maxFuncgenFreq(circuit);
  if (f > 0) return Math.min(Math.max(1 / f / 2, 1e-6), 1);
  return 1e-3;
}
