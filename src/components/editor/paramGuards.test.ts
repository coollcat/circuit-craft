// B6 参数防呆单元测试：空值 / 非数字 / 越界 / 0 / 负数 / step 取整 都不写入 NaN
import { describe, expect, it } from 'vitest';
import { normalizeNumericInput } from './ParamDialog';
import { PARAM_SCHEMA } from './symbols';

const R = PARAM_SCHEMA.resistor![0]; // resistance: min 1, max 1e6, log
const LED_IMAX = PARAM_SCHEMA.led!.find(f => f.key === 'imax')!; // min 0.005, max 0.5, step 0.005
const LDR_LIGHT = PARAM_SCHEMA.ldr![0]; // light: min 0, max 10000, step 50

describe('B6 参数输入防呆', () => {
  it('空输入 → 不写入（value=null）并提示恢复原值', () => {
    const r = normalizeNumericInput(R, '   ', 220);
    expect(r.value).toBeNull();
    expect(r.kind).toBe('error');
    expect(r.notice).toContain('220');
  });

  it('非数字 → 不写入，绝不产生 NaN', () => {
    for (const bad of ['abc', '--', 'Infinity', '-Infinity', '1e999', 'NaN']) {
      const r = normalizeNumericInput(R, bad, 220);
      expect(Number.isNaN(r.value as number)).toBe(false);
      expect(r.value).toBeNull(); // Infinity/1e999 一律当非法输入，保持原值
      expect(r.kind).toBe('error');
    }
  });

  it('负数 / 0 电阻 → 钳位到 min（不写入 0 或负数）', () => {
    expect(normalizeNumericInput(R, '-100', 220).value).toBe(1);
    expect(normalizeNumericInput(R, '0', 220).value).toBe(1);
    expect(normalizeNumericInput(R, '0', 220).notice).toContain('钳位');
  });

  it('超过 max → 钳位到 max', () => {
    const r = normalizeNumericInput(LED_IMAX, '9', 0.02);
    expect(r.value).toBe(0.5);
    expect(r.notice).toContain('钳位');
  });

  it('合法值按 step 取整后写入', () => {
    const r = normalizeNumericInput(LDR_LIGHT, '1234', 300);
    expect(r.value).toBe(1250); // step 50
    expect(r.notice).toBeUndefined();
  });

  it('中文逗号/空格容错（0,5 → 0.5）', () => {
    const wiper = PARAM_SCHEMA.pot!.find(f => f.key === 'wiper')!; // min 0.001 max 0.999 step 0.01
    // 上下限必须与 solver 的钳位一致（solver.ts 把 wiper 夹在 0.001~0.999），
    // 否则界面上能填 0/1 而仿真给出 0.005/4.995，读数和档位对不上（verifier 发现过这个不一致）。
    expect(wiper.min).toBe(0.001);
    expect(wiper.max).toBe(0.999);
    const r = normalizeNumericInput(wiper, ' 0,5 ', 0.5);
    expect(r.value).toBe(0.5);
  });

  it('PARAM_SCHEMA 新字段 ic.imax 可编辑且范围合理（c7-2 LDO 选型关依赖）', () => {
    const icImax = PARAM_SCHEMA.ic!.find(f => f.key === 'imax');
    expect(icImax).toBeDefined();
    expect(icImax!.min).toBe(0.01);
    expect(icImax!.max).toBe(1);
    const r = normalizeNumericInput(icImax!, '0.11', 0.05);
    expect(r.value).toBe(0.11);
  });

  it('功率 LED 的 imax=0.12（c4-5）落在 schema 范围内，不会被钳位改坏', () => {
    const r = normalizeNumericInput(LED_IMAX, '0.12', 0.12);
    expect(r.value).toBe(0.12);
    expect(r.notice).toBeUndefined();
  });
});
