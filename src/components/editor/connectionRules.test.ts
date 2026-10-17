// B1 连线防呆规则单元测试：自连 / 重复连 / 已同网络 / 电源短路 / 合法放行
// 直接测 CircuitEditor 导出的纯函数 validateConnection（与画布落线走同一条路径）。
import { describe, expect, it } from 'vitest';
import { validateConnection } from './CircuitEditor';
import type { CircuitSpec } from '@/engine/types';

const base: CircuitSpec = {
  components: [
    { id: 'BT1', type: 'battery', x: 64, y: 176 },
    { id: 'R1', type: 'resistor', x: 240, y: 176 },
    { id: 'R2', type: 'resistor', x: 240, y: 320 },
    { id: 'R3', type: 'resistor', x: 240, y: 464 },
    { id: 'GND1', type: 'gnd', x: 400, y: 272 },
  ],
  wires: [
    { id: 'w1', from: { comp: 'R1', port: 'b' }, to: { comp: 'R2', port: 'a' } },
    { id: 'w2', from: { comp: 'R2', port: 'a' }, to: { comp: 'R3', port: 'a' } },
  ],
};

describe('B1 非法连线拦截', () => {
  it('自连（同一端口）被拦截', () => {
    const v = validateConnection(base, { comp: 'R1', port: 'a' }, { comp: 'R1', port: 'a' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.kind).toBe('self');
  });

  it('同一对端口重复连被拦截（无向）', () => {
    const v1 = validateConnection(base, { comp: 'R1', port: 'b' }, { comp: 'R2', port: 'a' });
    const v2 = validateConnection(base, { comp: 'R2', port: 'a' }, { comp: 'R1', port: 'b' });
    expect(v1.ok).toBe(false);
    expect(v2.ok).toBe(false);
    if (!v1.ok) expect(v1.kind).toBe('duplicate');
    if (!v2.ok) expect(v2.kind).toBe('duplicate');
  });

  it('间接同网络（多跳后已连通）被拦截，提示「已经连通」', () => {
    const v = validateConnection(base, { comp: 'R1', port: 'b' }, { comp: 'R3', port: 'a' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.kind).toBe('same-net');
      expect(v.msg).toContain('已经连通');
    }
  });

  it('把电池正负极直接短接被拦截，提示会烧毁', () => {
    const v = validateConnection(base, { comp: 'BT1', port: 'pos' }, { comp: 'BT1', port: 'neg' });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.kind).toBe('short');
      expect(v.msg).toContain('短接');
    }
  });

  it('经过既有支路的间接短路（正极网↔负极网）也被拦截', () => {
    // BT1:neg 已接 R2:a；再从 BT1:pos 连到 R2:a 等价于把电源正负极短接
    const withNeg: CircuitSpec = {
      ...base,
      wires: [...base.wires, { id: 'w3', from: { comp: 'BT1', port: 'neg' }, to: { comp: 'R2', port: 'a' } }],
    };
    const v = validateConnection(withNeg, { comp: 'BT1', port: 'pos' }, { comp: 'R2', port: 'a' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.kind).toBe('short');
  });

  it('合法连线放行', () => {
    const v = validateConnection(base, { comp: 'BT1', port: 'pos' }, { comp: 'R1', port: 'a' });
    expect(v.ok).toBe(true);
  });
});
