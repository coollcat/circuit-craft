// 新增元件族的引擎行为测试：光敏/热敏/肖特基/蜂鸣器/扬声器/变压器
import { describe, expect, it } from 'vitest';
import { compileCircuit, passiveR, solveDC } from './solver';
import type { CircuitSpec, ComponentSpec } from './types';

function comp(type: ComponentSpec['type'], params?: Record<string, number | string | boolean>): ComponentSpec {
  return { id: type.toUpperCase(), type, x: 0, y: 0, params };
}
function circuit(comps: ComponentSpec[], wires: [string, string][]): CircuitSpec {
  return {
    components: comps,
    wires: wires.map(([a, b], i) => ({
      id: `w${i}`,
      from: { comp: a.split(':')[0], port: a.split(':')[1] },
      to: { comp: b.split(':')[0], port: b.split(':')[1] },
    })),
  };
}

describe('阻性元件族 passiveR', () => {
  it('ldr：光照越强阻值越小（暗 500k → 强光数百欧）', () => {
    const dark = passiveR(comp('ldr', { light: 0 }));
    const mid = passiveR(comp('ldr', { light: 300 }));
    const bright = passiveR(comp('ldr', { light: 5000 }));
    expect(dark).toBeCloseTo(5e5, -2);
    expect(mid).toBeLessThan(dark);
    expect(bright).toBeGreaterThan(800);
    expect(bright).toBeLessThan(1200); // 5e5/(1+500) ≈ 1kΩ
  });

  it('thermistor：NTC 温度越高阻值越小（B=3950 曲线）', () => {
    const cold = passiveR(comp('thermistor', { r25: 10000, temp: -20 }));
    const t25 = passiveR(comp('thermistor', { r25: 10000, temp: 25 }));
    const hot = passiveR(comp('thermistor', { r25: 10000, temp: 100 }));
    expect(t25).toBeCloseTo(10000, -2);
    expect(cold).toBeGreaterThan(t25 * 5);
    expect(hot).toBeLessThan(t25 / 5);
  });

  it('buzzer/speaker：纯阻负载，取各自音圈参数', () => {
    expect(passiveR(comp('buzzer'))).toBe(30);
    expect(passiveR(comp('speaker', { impedance: 32 }))).toBe(32);
  });
});

describe('二极管族', () => {
  it('schottky 在同样电压下比硅二极管导通得更狠（低压降优势）', () => {
    const build = (type: ComponentSpec['type']) =>
      circuit(
        [comp('battery', { voltage: 1 }), comp(type)],
        [['BATTERY:pos', `${type.toUpperCase()}:a`], [`${type.toUpperCase()}:k`, 'BATTERY:neg']],
      );
    const si = solveDC(build('diode')).branchCurrents.get('DIODE')!;
    const sk = solveDC(build('schottky')).branchCurrents.get('SCHOTTKY')!;
    expect(si).toBeCloseTo(0.15, 6); // (1V − 0.7V) / 2Ω
    expect(sk).toBeCloseTo(0.7, 6); // (1V − 0.3V) / 1Ω
  });
});

describe('变压器（理想比模型）', () => {
  it('副边电压 = 匝数比 × 原边电压；原边呈现励磁阻抗', () => {
    const cc = circuit(
      [
        comp('battery', { voltage: 5 }),
        comp('transformer', { ratio: 2 }),
        comp('resistor', { resistance: 1000 }), // 副边负载
      ],
      [
        ['BATTERY:pos', 'TRANSFORMER:p1'],
        ['TRANSFORMER:p2', 'BATTERY:neg'],
        ['TRANSFORMER:s1', 'RESISTOR:a'],
        ['RESISTOR:b', 'TRANSFORMER:s2'],
      ],
    );
    const res = solveDC(cc);
    expect(res.ok).toBe(true);
    const vOf = (ref: string) => {
      const net = res.netOf.get(ref)!;
      return res.nodeVoltages.get(net) ?? 0;
    };
    const vs = vOf('TRANSFORMER:s1') - vOf('TRANSFORMER:s2');
    expect(vs).toBeCloseTo(10, 6); // 5V × 匝数比 2
    // 原边电流 = 励磁阻抗 1kΩ 决定：5V/1k = 5mA（挂在 "id" 键）
    expect(res.branchCurrents.get('TRANSFORMER')!).toBeCloseTo(0.005, 9);
    // 副边负载电流 10V/1k = 10mA（挂在 "id:s" 键，方向为负）
    expect(Math.abs(res.branchCurrents.get('TRANSFORMER:s')!)).toBeCloseTo(0.01, 9);
  });

  it('副边被导线短接 → 求解失败并给出可读错误', () => {
    const cc = circuit(
      [comp('battery', { voltage: 5 }), comp('transformer', { ratio: 2 })],
      [
        ['BATTERY:pos', 'TRANSFORMER:p1'],
        ['TRANSFORMER:p2', 'BATTERY:neg'],
        ['TRANSFORMER:s1', 'TRANSFORMER:s2'],
      ],
    );
    const res = solveDC(cc);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('短接');
  });

  it('compileCircuit 不把变压器四端口连通（耦合走受控源而非导线语义）', () => {
    const cc = circuit([comp('transformer')], []);
    const cp = compileCircuit(cc);
    const nets = new Set(['p1', 'p2', 's1', 's2'].map(p => cp.netOf.get(`TRANSFORMER:${p}`)));
    expect(nets.size).toBe(4); // 四个端口四个独立网络
  });
});
