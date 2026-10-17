// explain.ts（代入演算模块）测试：保证教学展示的推导与引擎实际解一致
// 注意：本文件由 lead 维护；求解器物理用例在 solver.test.ts（engine-calc 维护）。
import { describe, expect, it } from 'vitest';
import { solveDC } from './solver';
import { explainComponent, explainGoal, netVoltageTable, powerLedger } from './explain';
import type { CircuitSpec, ComponentSpec, GoalCheck } from './types';

function comp(id: string, type: ComponentSpec['type'], params?: Record<string, number | string | boolean>): ComponentSpec {
  return { id, type, x: 0, y: 0, params };
}
function circuit(components: ComponentSpec[], wires: [string, string][]): CircuitSpec {
  return {
    components,
    wires: wires.map(([a, b], i) => ({
      id: `w${i}`,
      from: { comp: a.split(':')[0], port: a.split(':')[1] },
      to: { comp: b.split(':')[0], port: b.split(':')[1] },
    })),
  };
}

/** 9V → 1kΩ → 中点 B → 1kΩ → GND ：分压 4.5V，电流 4.5mA */
const divider = () =>
  circuit(
    [
      comp('BT1', 'battery', { voltage: 9 }),
      comp('R1', 'resistor', { resistance: 1000 }),
      comp('R2', 'resistor', { resistance: 1000 }),
    ],
    [
      ['BT1:pos', 'R1:a'],
      ['R1:b', 'R2:a'],
      ['R2:b', 'BT1:neg'],
    ],
  );

describe('explainComponent —— 代入演算', () => {
  it('电阻：给出通式、代入值与结论，且与求解结果一致', () => {
    const c = divider();
    const res = solveDC(c);
    const d = explainComponent('R1', c, res)!;
    expect(d).not.toBeNull();
    expect(d.formula).toContain('I = (V_a − V_b) / R');
    // 实测两端电压 4.5V、电流 4.5mA（formatSI 保留 3 位有效数字 → "4.50 mA"）
    expect(d.lines.some(l => l.includes('4.5'))).toBe(true);
    expect(d.result).toContain('4.50 mA');
  });

  it('LED 导通时给出 (V_a − V_k − V_f)/r_on 的代入，截止时说明原因', () => {
    const on = circuit(
      [comp('BT1', 'battery', { voltage: 5 }), comp('R1', 'resistor', { resistance: 150 }), comp('LED1', 'led')],
      [
        ['BT1:pos', 'R1:a'],
        ['R1:b', 'LED1:a'],
        ['LED1:k', 'BT1:neg'],
      ],
    );
    const dOn = explainComponent('LED1', on, solveDC(on))!;
    expect(dOn.lines.join('\n')).toContain('导通');
    expect(dOn.result).toContain('正向导通');

    // 反接：阳极接地、阴极接正 → 截止，不应报告“导通”
    const off = circuit(
      [comp('BT1', 'battery', { voltage: 5 }), comp('R1', 'resistor', { resistance: 150 }), comp('LED1', 'led')],
      [
        ['BT1:pos', 'R1:a'],
        ['R1:b', 'LED1:k'],
        ['LED1:a', 'BT1:neg'],
      ],
    );
    const dOff = explainComponent('LED1', off, solveDC(off))!;
    expect(dOff.result).toContain('截止');
  });

  it('无解或不存在的元件返回 null（界面据此回落占位，不崩）', () => {
    const c = divider();
    expect(explainComponent('NOPE', c, solveDC(c))).toBeNull();
    expect(explainComponent('R1', c, null)).toBeNull();
  });
});

describe('powerLedger —— 能量守恒账本', () => {
  it('纯电阻电路 ΣP ≈ 0：电源发出 = 电阻耗散', () => {
    const c = divider();
    const ledger = powerLedger(c, solveDC(c));
    const rows = ledger.rows;
    expect(rows.length).toBe(3); // BT1 + R1 + R2
    expect(rows[0].source).toBe(true);
    // 9V 串 2kΩ → 4.5mA → P = 40.5mW
    expect(Math.abs(rows.find(r => r.id === 'BT1')!.p)).toBeCloseTo(0.0405, 6);
    expect(Math.abs(ledger.total)).toBeLessThan(1e-9);
  });
});

describe('netVoltageTable —— 电路状态表', () => {
  it('包含全部网络、按电压降序、地显示为 GND 且为 0V', () => {
    const c = divider();
    const rows = netVoltageTable(c, solveDC(c));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some(r => r.label === 'GND' && Math.abs(r.v) < 1e-12)).toBe(true);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].v).toBeGreaterThanOrEqual(rows[i].v);
    expect(rows[0].v).toBeCloseTo(9, 6);
  });
});

describe('explainGoal —— 差多少、往哪调', () => {
  it('节点电压在范围内时报告“在范围内”，超出时报偏差', () => {
    const c = divider();
    const res = solveDC(c);
    const okGoal: GoalCheck = { kind: 'node-voltage', node: { comp: 'R2', port: 'a' }, min: 4, max: 5 };
    expect(explainGoal(okGoal, c, res)!).toContain('在范围内');

    const badGoal: GoalCheck = { kind: 'node-voltage', node: { comp: 'R2', port: 'a' }, min: 2, max: 3 };
    const text = explainGoal(badGoal, c, res)!;
    expect(text).toContain('偏大');
    expect(text).toContain('1.5'); // 4.5 − 3 = 1.5V
  });

  it('参数目标给出当前值、目标区间与方向', () => {
    const c = divider();
    const res = solveDC(c);
    const g: GoalCheck = { kind: 'param', comp: 'R1', param: 'resistance', min: 2000, max: 3000 };
    const text = explainGoal(g, c, res)!;
    expect(text).toContain('R1.resistance');
    expect(text).toContain('偏小');
  });

  it('无解时返回 null', () => {
    const c = divider();
    expect(explainGoal({ kind: 'branch-current', comp: 'R1', min: 1, max: 2 }, c, null)).toBeNull();
  });
});
