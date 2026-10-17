// 编辑器渲染冒烟测试（react-dom/server，无需 jsdom）：
// 验证画布在有电路/无电路时都能渲染，且 B2/B4/B7 的新 UI（灰点、撤销按钮、悬空计数）真的出现。
// 注意：vitest include 只收 *.test.ts，这里用 createElement 而不是 JSX。
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import CircuitEditor from './CircuitEditor';
import type { CircuitSpec } from '@/engine/types';

const circuit: CircuitSpec = {
  components: [
    { id: 'BT1', type: 'battery', x: 64, y: 176 },
    { id: 'R1', type: 'resistor', x: 240, y: 176 },
    { id: 'GND1', type: 'gnd', x: 400, y: 272 },
  ],
  wires: [{ id: 'w1', from: { comp: 'R1', port: 'b' }, to: { comp: 'GND1', port: 'gnd' } }],
};

const noop = () => {};
const render = (c: CircuitSpec, readOnly = false) =>
  // SSR 会在相邻文本节点间插 <!-- -->，先剥掉注释再断言，避免误判
  renderToString(createElement(CircuitEditor, { circuit: c, onChange: noop, readOnly })).replace(/<!--[\s\S]*?-->/g, '');

describe('CircuitEditor 渲染冒烟', () => {
  it('有电路时可渲染，并出现撤销/重做与悬空端口计数', () => {
    const html = render(circuit);
    expect(html).toContain('撤销');
    expect(html).toContain('重做');
    // BT1:pos / BT1:neg / R1:a / GND1 已接 → 还有若干个引脚没接线
    expect(html).toMatch(/还有 \d+ 个引脚没接线/);
    // 未接线端口画灰色虚线环（B7）
    expect(html).toContain('stroke-dasharray="2 2"');
  });

  it('全部端口接好时不显示悬空计数', () => {
    const full: CircuitSpec = {
      components: [
        { id: 'BT1', type: 'battery', x: 64, y: 176 },
        { id: 'R1', type: 'resistor', x: 240, y: 176 },
      ],
      wires: [
        { id: 'w1', from: { comp: 'BT1', port: 'pos' }, to: { comp: 'R1', port: 'a' } },
        { id: 'w2', from: { comp: 'BT1', port: 'neg' }, to: { comp: 'R1', port: 'b' } },
      ],
    };
    const html = render(full);
    expect(html).not.toMatch(/还有 \d+ 个引脚没接线/);
  });

  it('readOnly 时不出现撤销按钮与悬空计数（只读画布零干扰）', () => {
    const html = render(circuit, true);
    expect(html).not.toContain('撤销');
    expect(html).not.toMatch(/还有 \d+ 个引脚没接线/);
  });

  it('空电路也不崩（沙盒初始态）', () => {
    const html = render({ components: [], wires: [] });
    expect(html).toContain('SCHEMATIC');
  });
});
