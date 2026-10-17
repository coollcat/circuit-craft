// 求解器解析/物理测试（W3）
// 覆盖：阻性元件族、二极管族单调模型（C1）、电位器极性（C2）、NPN 有源区（C3）、
// 接地参考检查（C4）、参数别名（C5）、收敛标志（C6）、LED 应力积分（C7）、
// 变压器能量守恒（C8）、传感器噪声步长（C9）以及 D1–D14 手算用例。
import { describe, expect, it } from 'vitest';
import {
  CircuitSimulator,
} from './simulator';
import {
  compileCircuit, funcgenValue, maxSignalFreq, newDynState, numParam, passiveR,
  solveDC, updateFailures, type SolveResult,
} from './solver';
import type { CircuitSpec, ComponentSpec, ComponentType, WireSpec } from './types';

/* ---------------------------------- 测试脚手架 ---------------------------------- */

function comp(id: string, type: ComponentType, params?: Record<string, number | string | boolean>): ComponentSpec {
  return { id, type, x: 0, y: 0, params };
}
function build(components: ComponentSpec[], pairs: [string, string][]): CircuitSpec {
  const wires: WireSpec[] = pairs.map(([a, b], i) => {
    const [ac, ap] = a.split(':');
    const [bc, bp] = b.split(':');
    return { id: `w${i}`, from: { comp: ac, port: ap }, to: { comp: bc, port: bp } };
  });
  return { components, wires };
}
/** 端口电压（V） */
function pv(res: SolveResult, ref: string): number {
  const net = res.netOf.get(ref);
  expect(net, `缺少端口 ${ref}`).toBeDefined();
  return res.nodeVoltages.get(net!) ?? 0;
}
/** 支路电流（A） */
function iOf(res: SolveResult, id: string): number {
  const i = res.branchCurrents.get(id);
  expect(i, `缺少支路电流 ${id}`).toBeDefined();
  return i!;
}
const abs = Math.abs;

/* ---------------------------------- 阻性元件族 ---------------------------------- */

describe('阻性元件族 passiveR', () => {
  it('ldr：光照越强阻值越小（暗 500k → 强光数百欧）', () => {
    const dark = passiveR(comp('L', 'ldr', { light: 0 }));
    const mid = passiveR(comp('L', 'ldr', { light: 300 }));
    const bright = passiveR(comp('L', 'ldr', { light: 5000 }));
    expect(dark).toBeCloseTo(5e5, -2);
    expect(mid).toBeLessThan(dark);
    expect(bright).toBeGreaterThan(800);
    expect(bright).toBeLessThan(1200); // 5e5/(1+500) ≈ 1kΩ
  });

  it('thermistor：NTC 温度越高阻值越小（B=3950 曲线）', () => {
    const cold = passiveR(comp('T', 'thermistor', { r25: 10000, temp: -20 }));
    const t25 = passiveR(comp('T', 'thermistor', { r25: 10000, temp: 25 }));
    const hot = passiveR(comp('T', 'thermistor', { r25: 10000, temp: 100 }));
    expect(t25).toBeCloseTo(10000, -2);
    expect(cold).toBeGreaterThan(t25 * 5);
    expect(hot).toBeLessThan(t25 / 5);
  });

  it('buzzer/speaker：纯阻负载，取各自音圈参数', () => {
    expect(passiveR(comp('B', 'buzzer'))).toBe(30);
    expect(passiveR(comp('S', 'speaker', { impedance: 32 }))).toBe(32);
  });
});

/* ---------------------------------- C5：参数别名 ---------------------------------- */

describe('C5 参数读取：用户 params 优先于默认值（别名可用）', () => {
  it('别名 r/c/l/v/fs 都能覆盖默认值', () => {
    expect(numParam(comp('R', 'resistor', { r: 1000 }), ['resistance', 'r'], 220)).toBe(1000);
    expect(passiveR(comp('R', 'resistor', { r: 1000 }))).toBe(1000);
    expect(numParam(comp('C', 'capacitor', { c: 2e-6 }), ['capacitance', 'c'], 1e-6)).toBe(2e-6);
    expect(numParam(comp('L', 'inductor', { l: 2e-3 }), ['inductance', 'l'], 1e-3)).toBe(2e-3);
    expect(numParam(comp('V', 'vsrc', { v: 3.3 }), ['voltage', 'v'], 5)).toBe(3.3);
    expect(numParam(comp('S', 'sensor', { value: 2.4 }), ['output', 'value'], 1.65)).toBe(2.4);
    expect(numParam(comp('F', 'funcgen', { fs: 2500 }), ['freq', 'fs'], 1000)).toBe(2500);
  });

  it('主键优先于别名；全部缺失才回落默认值', () => {
    expect(numParam(comp('R', 'resistor', { resistance: 470, r: 1000 }), ['resistance', 'r'], 220)).toBe(470);
    expect(numParam(comp('R', 'resistor'), ['resistance', 'r'], 220)).toBe(220);
    expect(numParam(comp('R', 'resistor', { other: 1 }), ['resistance', 'r'], 220)).toBe(220);
  });

  it('别名在求解里真正生效（resistor.r=1000）', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('R', 'resistor', { r: 1000 })],
      [['BT:pos', 'R:a'], ['R:b', 'BT:neg']],
    ));
    expect(res.ok).toBe(true);
    expect(abs(iOf(res, 'R') - 5e-3)).toBeLessThan(1e-9);
  });

  it('波形别名 wave 生效（funcgenValue）', () => {
    const sq = comp('F', 'funcgen', { wave: 'square', freq: 100, vmin: 0, vmax: 1 });
    expect(funcgenValue(sq, 0)).toBe(1);
    expect(funcgenValue(sq, 0.006)).toBe(0);
    // 默认值仍是 sine（不被别名机制破坏）：t=0 时 sin(0)=0 → 输出中点 0.5V
    expect(funcgenValue(comp('F', 'funcgen', { freq: 100, vmin: 0, vmax: 1 }), 0)).toBe(0.5);
  });
});

/* ---------------------------------- C1：二极管族 ---------------------------------- */

describe('C1 二极管/肖特基/LED：单调分段线性 i = max(0, (Vd−Vf)/rOn)', () => {
  it('schottky 在同样电压下比硅二极管导通得更狠（低压降优势）', () => {
    const mk = (type: ComponentType) => build(
      [comp('BT', 'battery', { voltage: 1 }), comp('D', type)],
      [['BT:pos', 'D:a'], ['D:k', 'BT:neg']],
    );
    expect(abs(iOf(solveDC(mk('diode')), 'D') - 0.15)).toBeLessThan(1e-9);   // (1−0.7)/2
    expect(abs(iOf(solveDC(mk('schottky')), 'D') - 0.7)).toBeLessThan(1e-9); // (1−0.3)/1
  });

  it('D10 互补性：0.5V + 10Ω + 二极管(0.7V,2Ω) ⇒ V=0.5V、I≈0（不再倒灌 −16.7mA）', () => {
    const res = solveDC(build(
      [comp('VS', 'vsrc', { voltage: 0.5 }), comp('R', 'resistor', { resistance: 10 }), comp('D', 'diode', { vf: 0.7, rOn: 2 })],
      [['VS:pos', 'R:a'], ['R:b', 'D:a'], ['D:k', 'VS:neg']],
    ));
    expect(res.ok).toBe(true);
    expect(abs(pv(res, 'D:a') - 0.5)).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'D'))).toBeLessThan(1e-6);
    // 器件不得输出功率（旧模型在 0.5V 下算出 Vd=0.6667V、I=−16.7mA）
    expect(pv(res, 'D:a') * iOf(res, 'D')).toBeGreaterThan(-1e-12);
  });

  it('欠压二极管完全截止：0.6V 源 + 10Ω 仍是 0.6V / 0A', () => {
    const res = solveDC(build(
      [comp('VS', 'vsrc', { voltage: 0.6 }), comp('R', 'resistor', { resistance: 10 }), comp('D', 'diode')],
      [['VS:pos', 'R:a'], ['R:b', 'D:a'], ['D:k', 'VS:neg']],
    ));
    expect(abs(pv(res, 'D:a') - 0.6)).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'D'))).toBeLessThan(1e-9);
  });

  it('stamp 与读回同一判据：二极管电流 = 串联电阻电流（KCL 自洽）', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('R', 'resistor', { resistance: 1000 }), comp('D', 'diode', { vf: 0.7, rOn: 2 })],
      [['BT:pos', 'R:a'], ['R:b', 'D:a'], ['D:k', 'BT:neg']],
    ));
    expect(abs(iOf(res, 'R') - iOf(res, 'D'))).toBeLessThan(1e-12);
    expect(abs(iOf(res, 'D') - (5 - 0.7) / (1000 + 2))).toBeLessThan(1e-9);
  });

  it('稳压管正向导通同普通二极管：5V+470Ω ⇒ I=9.11mA', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('R', 'resistor', { resistance: 470 }), comp('Z', 'zener', { vf: 0.7, rOn: 2 })],
      [['BT:pos', 'R:a'], ['R:b', 'Z:a'], ['Z:k', 'BT:neg']],
    ));
    expect(abs(iOf(res, 'Z') - (5 - 0.7) / 472)).toBeLessThan(1e-9);
    // 正向压降落在阳极节点上：V(a) = Vf + rOn·I = 0.7182V（阴极接地）
    expect(abs(pv(res, 'Z:a') - (0.7 + 2 * ((5 - 0.7) / 472)))).toBeLessThan(1e-6);
  });

  it('D9 LED rOn 语义：5V + 150Ω + LED(2V,5Ω) ⇒ 3/155 = 19.355mA', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('R', 'resistor', { resistance: 150 }), comp('LED', 'led', { vf: 2, rOn: 5 })],
      [['BT:pos', 'R:a'], ['R:b', 'LED:a'], ['LED:k', 'BT:neg']],
    ));
    expect(abs(iOf(res, 'LED') - 3 / 155)).toBeLessThan(1e-7);
  });

  it('D8 稳压管反向击穿：9V+470Ω+(k→A, a→地, vz5.1/rz10) ⇒ V(A)=5.18125V、I_R=8.125mA', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 9 }), comp('R', 'resistor', { resistance: 470 }), comp('Z', 'zener', { vz: 5.1, rz: 10 })],
      [['BT:pos', 'R:a'], ['R:b', 'Z:k'], ['Z:a', 'BT:neg']],
    ));
    expect(res.ok).toBe(true);
    expect(abs(pv(res, 'Z:k') - 5.18125)).toBeLessThan(1e-3);
    expect(abs(iOf(res, 'R') - 8.125e-3)).toBeLessThan(1e-6);
    // 稳压管反向电流：k→a，读回为负、幅值 8.125mA
    expect(abs(abs(iOf(res, 'Z')) - 8.125e-3)).toBeLessThan(1e-6);
  });
});

/* ---------------------------------- C2：电位器极性 ---------------------------------- */

describe('C2 电位器极性：0=靠 b 端、1=靠 a 端（V_w = V_b + (V_a−V_b)·w）', () => {
  const mk = (wiper: number) => build(
    [comp('BT', 'battery', { voltage: 5 }), comp('RP', 'pot', { resistance: 10000, wiper }), comp('G', 'gnd')],
    [['BT:pos', 'RP:a'], ['RP:b', 'G:gnd'], ['BT:neg', 'G:gnd']],
  );

  it('D11 wiper=0.25 ⇒ V(w)=1.25V（且抽头电流守恒）', () => {
    const res = solveDC(mk(0.25));
    expect(res.ok).toBe(true);
    expect(abs(pv(res, 'RP:w') - 1.25)).toBeLessThan(1e-6);
    const iaw = (pv(res, 'RP:a') - pv(res, 'RP:w')) / (10000 * (1 - 0.25));
    const iwb = pv(res, 'RP:w') / (10000 * 0.25);
    expect(abs(iaw - iwb)).toBeLessThan(1e-12);
    expect(abs(iaw - iOf(res, 'RP'))).toBeLessThan(1e-12);
  });

  it('D11 钳位：wiper=0 ⇒ ≈0V、wiper=1 ⇒ ≈5V', () => {
    expect(abs(pv(solveDC(mk(0)), 'RP:w') - 0.005)).toBeLessThan(1e-3);
    expect(abs(pv(solveDC(mk(1)), 'RP:w') - 4.995)).toBeLessThan(1e-3);
  });
});

/* ---------------------------------- C3：NPN 有源区 ---------------------------------- */

describe('C3 NPN 有源区模型：Ic = min(β·Ib, 饱和上限)', () => {
  const mk = (rb: number, beta = 100) => build(
    [
      comp('BT', 'battery', { voltage: 5 }),
      comp('RP', 'resistor', { resistance: rb }),
      comp('Q', 'npn', { beta, vf: 0.7, vceSat: 0.2, rOn: 2 }),
      comp('R2', 'resistor', { resistance: 330 }),
      comp('LED', 'led', { vf: 2, rOn: 5 }),
    ],
    [
      ['BT:pos', 'RP:a'], ['RP:b', 'Q:b'],
      ['BT:pos', 'R2:a'], ['R2:b', 'LED:a'], ['LED:k', 'Q:c'], ['Q:e', 'BT:neg'],
    ],
  );

  it('D7 饱和：Rb=43k ⇒ I_LED = 2.8/337 = 8.309mA，Vce≈0.225V', () => {
    const res = solveDC(mk(43000));
    expect(res.ok).toBe(true);
    expect(abs(iOf(res, 'LED') - 2.8 / 337)).toBeLessThan(1e-6);
    expect(abs(iOf(res, 'Q') - 2.8 / 337)).toBeLessThan(1e-6);
    const vce = pv(res, 'Q:c') - pv(res, 'Q:e');
    expect(vce).toBeGreaterThan(0.2);
    expect(vce).toBeLessThan(0.3);
    expect(res.converged).toBe(true);
  });

  it('D7 放大区：Rb=200k ⇒ I ≈ β·Ib = 2.149mA（旧模型给满电流 8.3mA）', () => {
    const res = solveDC(mk(200000));
    const ib = (5 - 0.7) / (200000 + 50);
    expect(abs(iOf(res, 'LED') - 100 * ib)).toBeLessThan(1e-5);
    expect(abs(iOf(res, 'LED') - 2.149e-3)).toBeLessThan(1e-5);
    expect(iOf(res, 'LED')).toBeLessThan(0.005);
    expect(res.converged).toBe(true);
  });

  it('beta 真正参与计算：同一 200k 基极电阻下 beta=50 的 Ic 是 beta=100 的一半', () => {
    const ic = (beta: number) => iOf(solveDC(mk(200000, beta)), 'LED');
    const b100 = ic(100);
    const b50 = ic(50);
    expect(abs(b50 - b100 / 2)).toBeLessThan(1e-6);
    expect(b50).toBeGreaterThan(1e-4);
    expect(b50).toBeLessThan(0.005);
  });

  it('基极悬空（按键未按下）⇒ 三极管截止、LED 不亮（旧模型会被浮空基极“点燃”）', () => {
    const res = solveDC(build(
      [
        comp('BT', 'battery', { voltage: 5 }),
        comp('Q', 'npn', { beta: 100 }),
        comp('R2', 'resistor', { resistance: 330 }),
        comp('LED', 'led', { vf: 2 }),
        comp('SW', 'button'),
      ],
      [
        ['BT:pos', 'SW:a'], ['SW:b', 'Q:b'],
        ['BT:pos', 'R2:a'], ['R2:b', 'LED:a'], ['LED:k', 'Q:c'], ['Q:e', 'BT:neg'],
      ],
    ));
    expect(res.ok).toBe(true);
    expect(abs(iOf(res, 'LED'))).toBeLessThan(1e-6);
    expect(abs(iOf(res, 'Q'))).toBeLessThan(1e-6);
  });
});

/* ---------------------------------- C4：接地参考 ---------------------------------- */

describe('C4 接地参考检查（DC 口径）', () => {
  it('D12 孤立子图 ⇒ ok:false 且错误可读；补一条地线后即可求解', () => {
    const comps = [
      comp('G', 'gnd'), comp('BT', 'battery', { voltage: 5 }), comp('R1', 'resistor', { resistance: 1000 }),
      comp('R2', 'resistor', { resistance: 1000 }), comp('LED', 'led', { vf: 2 }),
    ];
    const isolated = build(comps, [
      ['BT:pos', 'R1:a'], ['R1:b', 'G:gnd'], ['BT:neg', 'G:gnd'],
      ['R2:a', 'LED:a'], ['LED:k', 'R2:b'], // 与主电路无任何连接
    ]);
    const bad = solveDC(isolated);
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain('接地');
    expect(bad.converged).toBe(false);

    const fixed = build(comps, [
      ['BT:pos', 'R1:a'], ['R1:b', 'G:gnd'], ['BT:neg', 'G:gnd'],
      ['R2:a', 'LED:a'], ['LED:k', 'R2:b'], ['R2:b', 'G:gnd'],
    ]);
    expect(solveDC(fixed).ok).toBe(true);
  });

  it('DC 口径不误报：电容串在回路里（RC/耦合电容）仍然可解', () => {
    const rc = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('R', 'resistor', { resistance: 1000 }), comp('C', 'capacitor', { capacitance: 1e-6 })],
      [['BT:pos', 'R:a'], ['R:b', 'C:a'], ['C:b', 'BT:neg']],
    ));
    expect(rc.ok).toBe(true);

    // 两颗电容串联：中间节点在 DC 下无直流通路 → 惰性网络用 GMIN 锚定，不报「没有接地参考」
    const coupling = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('C1', 'capacitor', { capacitance: 1e-6 }), comp('C2', 'capacitor', { capacitance: 1e-6 })],
      [['BT:pos', 'C1:a'], ['C1:b', 'C2:a'], ['C2:b', 'BT:neg']],
    ));
    expect(coupling.ok).toBe(true);
  });

  it('D13 两个理想电压源并联 ⇒ 矩阵奇异、ok:false', () => {
    const res = solveDC(build(
      [comp('BT1', 'battery', { voltage: 5 }), comp('BT2', 'battery', { voltage: 5 })],
      [['BT1:pos', 'BT2:pos'], ['BT1:neg', 'BT2:neg']],
    ));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('矩阵奇异');
  });

  it('未接电源的 MCU：vcc 惰性网络被锚定在 0V（不再出现 20mA/GMIN ≈ 5GV）', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 3.3 }), comp('RP', 'pot', { resistance: 10000, wiper: 0.5 }), comp('U', 'mcu'), comp('G', 'gnd')],
      [['BT:pos', 'RP:a'], ['RP:b', 'G:gnd'], ['BT:neg', 'G:gnd'], ['RP:w', 'U:p0'], ['U:gnd', 'G:gnd']],
    ));
    expect(res.ok).toBe(true);
    expect(abs(pv(res, 'U:vcc'))).toBeLessThan(1e-6);
    expect(abs(iOf(res, 'U'))).toBeLessThan(1e-12);
  });
});

/* ---------------------------------- C6：收敛标志 ---------------------------------- */

describe('C6 收敛标志与残差', () => {
  it('线性电路：converged=true、iterations≥2、residual<1e-7', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 9 }), comp('R1', 'resistor', { resistance: 10000 }), comp('R2', 'resistor', { resistance: 10000 })],
      [['BT:pos', 'R1:a'], ['R1:b', 'R2:a'], ['R2:b', 'BT:neg']],
    ));
    expect(res.converged).toBe(true);
    expect(res.iterations).toBeGreaterThanOrEqual(2);
    expect(res.residual ?? Infinity).toBeLessThan(1e-7);
  });

  it('求解失败时 converged=false（失败结果也带字段，向后兼容）', () => {
    const res = solveDC(build(
      [comp('BT1', 'battery', { voltage: 5 }), comp('BT2', 'battery', { voltage: 5 })],
      [['BT1:pos', 'BT2:pos'], ['BT1:neg', 'BT2:neg']],
    ));
    expect(res.ok).toBe(false);
    expect(res.converged).toBe(false);
  });
});

/* ---------------------------------- C7：LED 应力积分 ---------------------------------- */

describe('C7 LED 应力按仿真时间累加（不再依赖帧率/调用次数）', () => {
  const ledOnly: CircuitSpec = { components: [comp('LED', 'led', { vf: 2, rOn: 5, imax: 0.02 })], wires: [] };
  const overdriven = () => solveDC(build(
    [comp('BT', 'battery', { voltage: 5 }), comp('LED', 'led', { vf: 2, rOn: 5, imax: 0.02 })],
    [['BT:pos', 'LED:a'], ['LED:k', 'BT:neg']],
  ));

  it('dt=1e-3：99 次不烧、第 100 次累计 0.1s 烧毁', () => {
    const res = overdriven();
    expect(abs(iOf(res, 'LED') - 0.6)).toBeLessThan(1e-9); // (5−2)/5
    const st = newDynState();
    for (let k = 0; k < 99; k++) expect(updateFailures(ledOnly, res, st, 1e-3)).toEqual([]);
    expect(st.ledStress.get('LED')).toBeCloseTo(0.099, 6);
    const evts = updateFailures(ledOnly, res, st, 1e-3);
    expect(evts.map(e => e.type)).toEqual(['led-burn']);
  });

  it('同等仿真时长不同帧率结果一致（按仿真时间、不按调用次数）', () => {
    const res = overdriven();
    const callsToBurn = (dt: number, maxCalls: number): number => {
      const st = newDynState();
      for (let k = 1; k <= maxCalls; k++) {
        if (updateFailures(ledOnly, res, st, dt).length > 0) return k;
      }
      return Infinity;
    };
    expect(callsToBurn(1e-3, 200)).toBe(100);   // 100 × 1ms = 0.1s
    expect(callsToBurn(1e-4, 2000)).toBe(1000); // 1000 × 0.1ms = 0.1s
    // 10ms 帧率下 0.1s 约需 10 次调用（浮点累加可能落在第 10~11 次）
    const coarse = callsToBurn(0.01, 50);
    expect(coarse).toBeGreaterThanOrEqual(10);
    expect(coarse).toBeLessThanOrEqual(11);
  });

  it('dt=0 时按调用次数保守折算（1000 次 ≈ 0.1s）', () => {
    const res = overdriven();
    const st = newDynState();
    for (let k = 0; k < 999; k++) expect(updateFailures(ledOnly, res, st, 0)).toEqual([]);
    expect(updateFailures(ledOnly, res, st, 0).length).toBe(1);
  });

  it('未过流时应力按 2×dt 回落', () => {
    const safe = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('R', 'resistor', { resistance: 220 }), comp('LED', 'led', { vf: 2 })],
      [['BT:pos', 'R:a'], ['R:b', 'LED:a'], ['LED:k', 'BT:neg']],
    ));
    const st = newDynState();
    st.ledStress.set('LED', 0.05);
    updateFailures(ledOnly, safe, st, 0.005);
    expect(st.ledStress.get('LED')).toBeCloseTo(0.04, 9);
  });
});

/* ---------------------------------- C8：变压器能量守恒 ---------------------------------- */

describe('C8 理想变压器：Ip = −k·Is（负载反射、能量守恒）', () => {
  const mk = (ratio = 2, load = 1000) => build(
    [
      comp('BT', 'battery', { voltage: 5 }), comp('XF', 'transformer', { ratio }),
      comp('RL', 'resistor', { resistance: load }), comp('G', 'gnd'),
    ],
    [
      ['BT:pos', 'XF:p1'], ['XF:p2', 'BT:neg'], ['BT:neg', 'G:gnd'],
      ['XF:s1', 'RL:a'], ['RL:b', 'XF:s2'], ['XF:s2', 'G:gnd'],
    ],
  );

  it('D14 ratio 2 / 原边 5V / 副边 1kΩ ⇒ Vs=10V、Is=10mA、Ip=20mA，|ΣP|<1e-6W', () => {
    const res = solveDC(mk());
    expect(res.ok).toBe(true);
    const vs = pv(res, 'XF:s1') - pv(res, 'XF:s2');
    const is = iOf(res, 'XF:s');
    const ip = iOf(res, 'XF');
    expect(abs(vs - 10)).toBeLessThan(1e-9);
    expect(abs(is + 0.01)).toBeLessThan(1e-9);
    expect(abs(ip - 0.02)).toBeLessThan(1e-9);

    const pIn = 5 * ip;                        // 电源给原边的功率
    const pOut = vs * -is;                     // 副边负载吸收的功率
    expect(abs(pIn - 0.1)).toBeLessThan(1e-9);
    expect(abs(pIn - pOut)).toBeLessThan(1e-6);
  });

  it('原边电流随副边负载变化（不再是固定 1kΩ 励磁 5mA）', () => {
    const light = solveDC(mk(2, 10000));
    expect(abs(iOf(light, 'XF') - 0.002)).toBeLessThan(1e-9); // 10mA×k=2 → 2mA
    const open = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('XF', 'transformer', { ratio: 2 }), comp('G', 'gnd')],
      [['BT:pos', 'XF:p1'], ['XF:p2', 'BT:neg'], ['BT:neg', 'G:gnd'], ['XF:s2', 'G:gnd']],
    ));
    expect(abs(iOf(open, 'XF'))).toBeLessThan(1e-12); // 空载理想变压器不取励磁电流
  });

  it('副边被导线短接 → 求解失败并给出可读错误', () => {
    const res = solveDC(build(
      [comp('BT', 'battery', { voltage: 5 }), comp('XF', 'transformer', { ratio: 2 })],
      [['BT:pos', 'XF:p1'], ['XF:p2', 'BT:neg'], ['XF:s1', 'XF:s2']],
    ));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('短接');
  });

  it('compileCircuit 不把变压器四端口连通（耦合走受控源而非导线语义）', () => {
    const cp = compileCircuit(build([comp('XF', 'transformer')], []));
    const nets = new Set(['p1', 'p2', 's1', 's2'].map(p => cp.netOf.get(`XF:${p}`)));
    expect(nets.size).toBe(4); // 四个端口四个独立网络
  });
});

/* ---------------------------------- C9：步长决策 ---------------------------------- */

describe('C9 传感器噪声频率纳入步长决策', () => {
  it('maxSignalFreq 取 funcgen 与 sensor.noiseFreq 的最大值', () => {
    const circ = build(
      [
        comp('F', 'funcgen', { freq: 1000 }),
        comp('S1', 'sensor', { output: 0.5, noise: 0.1, noiseFreq: 159000 }),
        comp('S2', 'sensor', { output: 1.65, noise: 0, noiseFreq: 999999 }), // 无噪声不算
      ],
      [],
    );
    expect(maxSignalFreq(circ)).toBe(159000);
  });

  it('159kHz 噪声源使自适应步长缩到 1/(200f)（不再固定 1e-5 混叠）', () => {
    const noisy = build(
      [comp('S', 'sensor', { output: 0.5, noise: 0.15, noiseFreq: 159000 }), comp('R', 'resistor', { resistance: 10000 }), comp('G', 'gnd')],
      [['S:out', 'R:a'], ['R:b', 'G:gnd'], ['S:gnd', 'G:gnd']],
    );
    const sim = new CircuitSimulator(noisy);
    expect(sim.dt).toBeCloseTo(1 / (200 * 159000), 12);
    expect(sim.dt).toBeLessThan(1e-5);

    const quiet = new CircuitSimulator(build(
      [comp('S', 'sensor', { output: 0.5 }), comp('R', 'resistor', { resistance: 10000 }), comp('G', 'gnd')],
      [['S:out', 'R:a'], ['R:b', 'G:gnd'], ['S:gnd', 'G:gnd']],
    ));
    expect(quiet.dt).toBe(1e-5);
  });
});

/* ---------------------------------- D 节：数值用例 ---------------------------------- */

describe('D1 分压：9V + 10k + 10k', () => {
  const res = solveDC(build(
    [comp('BT', 'battery', { voltage: 9 }), comp('R1', 'resistor', { resistance: 10000 }), comp('R2', 'resistor', { resistance: 10000 })],
    [['BT:pos', 'R1:a'], ['R1:b', 'R2:a'], ['R2:b', 'BT:neg']],
  ));

  it('V(中点) = 4.5V、I = 0.45mA（tol 1e-9）', () => {
    expect(res.ok).toBe(true);
    expect(abs(pv(res, 'R1:b') - 4.5)).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'R1') - 4.5e-4)).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'R2') - 4.5e-4)).toBeLessThan(1e-9);
  });
});

describe('D2/D3 串并联与功率、KCL 平衡', () => {
  const res = solveDC(build(
    [
      comp('BT', 'battery', { voltage: 5 }), comp('R1', 'resistor', { resistance: 1000 }),
      comp('R2', 'resistor', { resistance: 1000 }), comp('R3', 'resistor', { resistance: 1000 }),
    ],
    [['BT:pos', 'R1:a'], ['R1:b', 'R2:a'], ['R1:b', 'R3:a'], ['R2:b', 'BT:neg'], ['R3:b', 'BT:neg']],
  ));

  it('D2：I=3.33333mA、V(B)=1.66667V、两支路各 1.66667mA（tol 1e-9）', () => {
    expect(res.ok).toBe(true);
    expect(abs(iOf(res, 'R1') - 1 / 300)).toBeLessThan(1e-9);
    expect(abs(pv(res, 'R1:b') - 5 / 3)).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'R2') - 5 / 3000)).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'R3') - 5 / 3000)).toBeLessThan(1e-9);
  });

  it('D3：P_src=16.6667mW、P_R=11.1111+2.7778+2.7778mW，|ΣP|<1e-9W、节点 B 的 ΣI<1e-12A', () => {
    const isrc = iOf(res, 'BT');
    const pSrc = 5 * abs(isrc);
    const pR1 = iOf(res, 'R1') ** 2 * 1000;
    const pR2 = iOf(res, 'R2') ** 2 * 1000;
    const pR3 = iOf(res, 'R3') ** 2 * 1000;
    expect(abs(pSrc - 16.6667e-3)).toBeLessThan(1e-6);
    expect(abs(pR1 - 11.1111e-3)).toBeLessThan(1e-6);
    expect(abs(pR2 - 2.7778e-3)).toBeLessThan(1e-6);
    expect(abs(pR3 - 2.7778e-3)).toBeLessThan(1e-6);
    expect(abs(pSrc - (pR1 + pR2 + pR3))).toBeLessThan(1e-9);
    expect(abs(iOf(res, 'R1') - iOf(res, 'R2') - iOf(res, 'R3'))).toBeLessThan(1e-12);
  });
});

describe('D4 RC 充电：1kΩ + 1µF 方波 0→5V@100Hz、dt=1e-5', () => {
  const rc = build(
    [
      comp('FG', 'funcgen', { waveform: 'square', freq: 100, vmin: 0, vmax: 5, duty: 0.5 }),
      comp('R', 'resistor', { resistance: 1000 }),
      comp('C', 'capacitor', { capacitance: 1e-6 }),
    ],
    [['FG:out', 'R:a'], ['R:b', 'C:a'], ['C:b', 'FG:gnd']],
  );

  it('t=τ=1ms 时 v≈3.1606V（tol 0.03）；t=5τ 时 ≈4.9663V（tol 5e-3）', () => {
    const sim = new CircuitSimulator(rc, 1e-5);
    expect(sim.error).toBeNull();
    sim.runSteps(100);
    const atTau = sim.nodeSeries({ comp: 'C', port: 'a' })!.at(0);
    expect(abs(atTau - 3.1606)).toBeLessThan(0.03);

    sim.runSteps(400); // 总计 500 步 = 5ms = 5τ（方波恰在 5ms 翻转，最后一点用 4.99ms 解）
    const at5Tau = sim.nodeSeries({ comp: 'C', port: 'a' })!.at(0);
    expect(abs(at5Tau - 4.9663)).toBeLessThan(5e-3);
  });
});

describe('D5/D6 运放', () => {
  it('D5 同相放大：0.2V、R1=1k、R2=9k ⇒ 2.000V±0.005（有限增益 1.99980V）', () => {
    const res = solveDC(build(
      [
        comp('VS', 'vsrc', { voltage: 0.2 }), comp('U', 'opamp'), comp('R1', 'resistor', { resistance: 1000 }),
        comp('R2', 'resistor', { resistance: 9000 }), comp('G', 'gnd'),
      ],
      [
        ['VS:pos', 'U:inp'], ['VS:neg', 'G:gnd'], ['R1:a', 'U:inn'], ['R1:b', 'G:gnd'],
        ['R2:a', 'U:inn'], ['R2:b', 'U:out'],
      ],
    ));
    expect(res.ok).toBe(true);
    expect(abs(pv(res, 'U:out') - 1.9998)).toBeLessThan(0.005);
  });

  it('D6 反相限幅：vee 接 −12V ⇒ −10.00V±0.01；vee 悬空时回落 0V（记录为已知教学简化）', () => {
    const mk = (withRail: boolean) => build(
      [
        comp('VS', 'vsrc', { voltage: 1 }), comp('U', 'opamp'), comp('R1', 'resistor', { resistance: 1000 }),
        comp('R2', 'resistor', { resistance: 10000 }), comp('G', 'gnd'),
        ...(withRail ? [comp('VN', 'vsrc', { voltage: 12 })] : []),
      ],
      [
        ['VS:pos', 'R1:a'], ['R1:b', 'U:inn'], ['R2:a', 'U:inn'], ['R2:b', 'U:out'],
        ['VS:neg', 'G:gnd'], ['U:inp', 'G:gnd'],
        ...(withRail ? ([['VN:pos', 'G:gnd'], ['VN:neg', 'U:vee']] as [string, string][]) : []),
      ],
    );
    const withRail = solveDC(mk(true));
    expect(withRail.ok).toBe(true);
    expect(abs(pv(withRail, 'U:out') + 10)).toBeLessThan(0.01);

    // 已知限制（非本任务修复项）：负电源轨悬空时 railLo 回落到 0V，输出被钳在 0V
    const floating = solveDC(mk(false));
    expect(floating.ok).toBe(true);
    expect(abs(pv(floating, 'U:out'))).toBeLessThan(1e-6);
  });
});
