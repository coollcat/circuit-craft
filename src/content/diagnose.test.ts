// W5 / P7：误解定向反馈纯函数的用例（只断言文本方向，不改判定）
import { describe, expect, it } from 'vitest';
import { diagnoseGoal, diagnoseGoals } from './diagnose';
import { getLevel } from './levels';
import { buildFactoryCircuit } from './solution';
import { solveDC } from '@/engine/solver';
import type { GoalStatus } from '@/engine/solver';
import type { CircuitSpec, GoalCheck } from '@/engine/types';

function level(id: string) {
  const l = getLevel(id);
  if (!l) throw new Error(`missing level ${id}`);
  return l;
}

/** 把某元件参数改掉后的出厂电路（模拟玩家当前状态） */
function withParam(circuit: CircuitSpec, compId: string, key: string, value: number): CircuitSpec {
  return {
    components: circuit.components.map(c => (c.id === compId ? { ...c, params: { ...(c.params ?? {}), [key]: value } } : c)),
    wires: circuit.wires.map(w => ({ ...w })),
  };
}

describe('diagnose：误解定向反馈', () => {
  const ledCurrent: GoalCheck = { kind: 'branch-current', comp: 'LED1', min: 10, max: 18 };

  it('电流≈0 → 指向极性/回路（c1-4：限流电阻过大）', () => {
    const l = level('c1-4');
    const circuit = withParam(buildFactoryCircuit(l), 'RP1', 'resistance', 10e6);
    const hints = diagnoseGoal(ledCurrent, circuit, solveDC(circuit), l);
    expect(hints.length).toBeGreaterThan(0);
    expect(hints.length).toBeLessThanOrEqual(2);
    expect(hints[0]).toContain('≈ 0');
    expect(hints.join('')).toMatch(/极性|回路/);
  });

  it('电流偏大 → 给出「调大电阻」的方向与倍数', () => {
    const l = level('c1-4');
    const circuit = withParam(buildFactoryCircuit(l), 'RP1', 'resistance', 47);
    const hints = diagnoseGoal(ledCurrent, circuit, solveDC(circuit), l);
    expect(hints[0]).toContain('超过上限');
    expect(hints[1]).toContain('调大');
  });

  it('参数超出上限 → 给出建议值与调整方向', () => {
    const l = level('c1-4');
    const circuit = buildFactoryCircuit(l);
    const goal: GoalCheck = { kind: 'param', comp: 'RP1', param: 'resistance', min: 160, max: 300 };
    const hints = diagnoseGoal(goal, circuit, solveDC(circuit), l);
    expect(hints[0]).toContain('超出上限');
    expect(hints[0]).toContain('建议');
  });

  it('节点电压偏低 → 指向分压比方向', () => {
    const l = level('c3-1');
    const circuit = withParam(buildFactoryCircuit(l), 'RP2', 'resistance', 100);
    const goal: GoalCheck = { kind: 'node-voltage', node: { comp: 'RP2', port: 'a' }, min: 5.7, max: 6.3 };
    const hints = diagnoseGoal(goal, circuit, solveDC(circuit), l);
    expect(hints[0]).toContain('比目标下限');
    expect(hints.join('')).toContain('分压偏低');
  });

  it('led-lit 未亮 → 先查极性再查回路', () => {
    const l = level('c1-4');
    const circuit = withParam(buildFactoryCircuit(l), 'RP1', 'resistance', 10e6);
    const hints = diagnoseGoal({ kind: 'led-lit', comp: 'LED1' }, circuit, solveDC(circuit), l);
    expect(hints[0]).toContain('没亮');
    expect(hints[0]).toContain('阳极');
  });

  it('连线目标 → 说明两点不同网络', () => {
    const l = level('c1-1');
    const circuit: CircuitSpec = { components: [...l.preset.components], wires: [] };
    const goal: GoalCheck = { kind: 'connected', a: { comp: 'BT1', port: 'pos' }, b: { comp: 'R1', port: 'a' } };
    const hints = diagnoseGoal(goal, circuit, solveDC(circuit), l);
    expect(hints[0]).toContain('不是同一个网络');
  });

  it('没有仿真结果 → 只提示先运行', () => {
    const l = level('c1-1');
    const hints = diagnoseGoal(ledCurrent, l.preset, null, l);
    expect(hints).toEqual(['先点 ▶ 运行，拿到仿真结果才能判断问题出在哪。']);
  });

  it('diagnoseGoals 只返回未达成目标（已达成的不出提示）', () => {
    const l = level('c1-4');
    const circuit = withParam(buildFactoryCircuit(l), 'RP1', 'resistance', 47);
    const statuses: GoalStatus[] = [
      { goal: { kind: 'param', comp: 'RP1', param: 'resistance', min: 160, max: 300 }, ok: false, detail: '' }, // 47 未达成
      { goal: { kind: 'component-placed', type: 'resistor', count: 1 }, ok: true, detail: '' }, // 已达成
    ];
    const out = diagnoseGoals(statuses, circuit, solveDC(circuit), l);
    expect(out.map(d => d.goal.kind)).toEqual(['param']);
  });
});
