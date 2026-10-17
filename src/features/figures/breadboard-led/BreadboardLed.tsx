// 面包板 LED 限流电路 —— 站点内嵌版（与离线预览 figures/out/breadboard-led.html 共用
// scene.ts / geometry.ts / parts.ts / model.ts：几何与物理只有一份实现）
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plateHtml } from '../kit/iso-kit';
import { ensureIsoStyles } from '../isoStyles';
import { buildParts, HEIGHT, WIDTH } from './geometry';
import { needleAt, pointerAt } from './parts';
import { BURN_SECONDS, operatingPoint, type Digits } from './model';
import { useProgress } from '@/store/progress';
import { useMotionOn } from '@/hooks/useMotionOn';

const DIAL_COUNT = 4;

export default function BreadboardLed() {
  const parts = useMemo(() => buildParts(), []);
  const theme = useProgress(s => s.settings.theme);
  const motion = useMotionOn();

  const hostRef = useRef<HTMLDivElement>(null);
  const [digits, setDigits] = useState<Digits>(parts.runtime.initial);
  const [burned, setBurned] = useState(false);
  const [selected, setSelected] = useState(1);
  const smoothing = useRef({ glow: 0, needle: 0 });

  const op = useMemo(() => operatingPoint(digits, burned), [digits, burned]);

  useEffect(ensureIsoStyles, []);

  /** 过流持续 BURN_SECONDS → 烧毁（与引擎 updateFailures 同一判据） */
  useEffect(() => {
    if (burned || !op.lethal) return;
    const id = window.setTimeout(() => setBurned(true), BURN_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [burned, op.lethal]);

  /** 卡片只建一次（SVG 是静态几何，动的东西由下面的 effect 直接写属性） */
  const cardHtml = useMemo(() => {
    const svg = `<svg class="iso-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${parts.label.replace(/"/g, '&quot;')}">${parts.body}</svg>`;
    return plateHtml({
      fig: '图解',
      title: '面包板 · LED 限流电路',
      hint: parts.hint,
      readout: '—',
      keys: parts.keys,
      caption: parts.caption,
      body: `<div class="iso-stage" style="touch-action:none">${svg}</div>`,
    });
  }, [parts]);

  /** 把当前状态画到 DOM：指针、表针、光斑、烧毁、读数 */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector('svg');
    if (!svg) return;
    for (let i = 0; i < DIAL_COUNT; i++) {
      const node = svg.querySelector(`[data-part="dial-${i}"] path`);
      node?.setAttribute('d', pointerAt(parts.runtime.dials[i].x, parts.runtime.dials[i].y, digits[i]));
    }
    const paint = (glow: number, needle: number) => {
      svg.querySelector('[data-part="needle"] path')?.setAttribute('d', needleAt(needle));
      const glowEl = svg.querySelector('[data-part="led-glow"]');
      glowEl?.setAttribute('opacity', String(0.12 + 0.88 * glow));
      const dome = svg.querySelector('[data-part="led-dome"]') as SVGGElement | null;
      if (dome) dome.style.filter = burned ? 'grayscale(1) brightness(0.4)' : '';
      svg.querySelector('[data-part="led-soot"]')?.setAttribute('opacity', burned ? '0.55' : '0');
      const readout = host.querySelector('[data-readout]');
      const text = `R = ${op.r} Ω · I = ${(op.i * 1000).toFixed(1)} mA · ${op.verdict}`;
      if (readout && readout.textContent !== text) readout.textContent = text;
    };

    if (!motion) {
      smoothing.current = { glow: op.glow, needle: op.needle };
      paint(op.glow, op.needle);
      return;
    }
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const k = 1 - Math.exp(-dt / 0.14);
      smoothing.current.glow += (op.glow - smoothing.current.glow) * k;
      smoothing.current.needle += (op.needle - smoothing.current.needle) * k;
      paint(smoothing.current.glow, smoothing.current.needle);
      const settled =
        Math.abs(op.glow - smoothing.current.glow) < 0.002 && Math.abs(op.needle - smoothing.current.needle) < 0.002;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [digits, burned, op, parts, motion]);

  /* ------------------------------ 交互：拖拽 / 键盘 ------------------------------ */
  const dragging = useRef<{ index: number; startY: number; startDigit: number } | null>(null);

  const dialAt = useCallback(
    (event: React.PointerEvent) => {
      const host = hostRef.current;
      const svg = host?.querySelector('svg');
      if (!host || !svg) return -1;
      const box = svg.getBoundingClientRect();
      const scale = box.width / WIDTH;
      const x = (event.clientX - box.left) / scale;
      const y = (event.clientY - box.top) / scale;
      for (let i = 0; i < DIAL_COUNT; i++) {
        const [dx, dy] = parts.runtime.dials[i].screen;
        if (Math.hypot(x - dx, y - dy) < 30) return i;
      }
      return -1;
    },
    [parts],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    const index = dialAt(event);
    if (index < 0) {
      // 点 LED 附近 = 换一颗新灯
      const host = hostRef.current?.querySelector('svg');
      if (host) {
        const box = host.getBoundingClientRect();
        const scale = box.width / WIDTH;
        const [lx, ly] = parts.runtime.ledScreen;
        if (Math.hypot((event.clientX - box.left) / scale - lx, (event.clientY - box.top) / scale - ly) < 36) {
          setBurned(false);
          return;
        }
      }
      return;
    }
    setSelected(index);
    dragging.current = { index, startY: event.clientY, startDigit: digits[index] };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragging.current;
    if (!drag) return;
    const step = Math.round((drag.startY - event.clientY) / 9);
    const next = Math.max(0, Math.min(9, drag.startDigit + step));
    if (next !== digits[drag.index]) {
      setDigits(prev => {
        const copy: Digits = [...prev] as Digits;
        copy[drag.index] = next;
        return copy;
      });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = (index: number, value: number) =>
      setDigits(prev => {
        const copy: Digits = [...prev] as Digits;
        copy[index] = Math.max(0, Math.min(9, value));
        return copy;
      });
    switch (event.key) {
      case 'ArrowLeft': setSelected(s => (s + DIAL_COUNT - 1) % DIAL_COUNT); break;
      case 'ArrowRight': setSelected(s => (s + 1) % DIAL_COUNT); break;
      case 'ArrowUp': step(selected, digits[selected] + 1); break;
      case 'ArrowDown': step(selected, digits[selected] - 1); break;
      case 'Home': step(selected, 0); break;
      case 'End': step(selected, 9); break;
      case 'r': case 'R': setBurned(false); break;
      default: return;
    }
    event.preventDefault();
  };

  return (
    <div
      ref={hostRef}
      className="iso"
      data-theme={theme === 'light' ? 'light' : 'dark'}
      role="group"
      aria-label="面包板 LED 限流电路：拖动或方向键拨动电阻箱，看电流与 LED 亮度"
      tabIndex={0}
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => { dragging.current = null; }}
      onPointerCancel={() => { dragging.current = null; }}
      onKeyDown={onKeyDown}
      dangerouslySetInnerHTML={{ __html: cardHtml }}
    />
  );
}
