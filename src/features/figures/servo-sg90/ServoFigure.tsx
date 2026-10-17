// SG90 舵机 —— 站点内嵌版（与离线预览 figures/out/servo-sg90.html 共用 scene/geometry/parts/model）
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plateHtml } from '../kit/iso-kit';
import { ensureIsoStyles } from '../isoStyles';
import { buildParts, HEIGHT, WIDTH } from './geometry';
import { hornAt, hornHolesAt, knobAt, pwmAt } from './parts';
import { PULSE_KNOB_MAX_MS, PULSE_KNOB_MIN_MS, PULSE_MAX_MS, PULSE_MIN_MS, PULSE_STEP_MS, clampPulse, servoState } from './model';
import { useProgress } from '@/store/progress';
import { useMotionOn } from '@/hooks/useMotionOn';

export interface ServoFigureProps {
  /** 受控初始脉宽（图鉴实验用它切换预设角度） */
  pulseMs?: number;
}

export default function ServoFigure({ pulseMs }: ServoFigureProps) {
  const parts = useMemo(() => buildParts(), []);
  const theme = useProgress(s => s.settings.theme);
  const motion = useMotionOn();
  const hostRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(() => clampPulse(pulseMs ?? 1.5));
  const smooth = useRef(pulse);
  const dragging = useRef<{ startY: number; startPulse: number } | null>(null);

  const st = useMemo(() => servoState(pulse), [pulse]);

  useEffect(ensureIsoStyles, []);
  useEffect(() => {
    if (pulseMs !== undefined) setPulse(clampPulse(pulseMs));
  }, [pulseMs]);

  const cardHtml = useMemo(() => {
    const svg = `<svg class="iso-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${parts.label.replace(/"/g, '&quot;')}">${parts.body}</svg>`;
    return plateHtml({
      fig: '图解',
      title: 'SG90 舵机 · PWM 控制',
      hint: parts.hint,
      readout: '—',
      keys: parts.keys,
      caption: parts.caption,
      body: `<div class="iso-stage">${svg}</div>`,
    });
  }, [parts]);

  /** 把当前状态画到 DOM：手臂、减重孔、PWM 波形、旋钮指针、读数 */
  useEffect(() => {
    const host = hostRef.current;
    const svg = host?.querySelector('svg');
    if (!host || !svg) return;
    const paint = (shown: number) => {
      const s = servoState(shown);
      const arm = hornAt(s.angle);
      svg.querySelector('[data-part="horn"]')?.setAttribute('d', arm);
      svg.querySelector('[data-part="horn-edge"]')?.setAttribute('d', arm);
      hornHolesAt(s.angle).forEach((d, i) => svg.querySelector(`[data-part="horn-hole-${i}"]`)?.setAttribute('d', d));
      svg.querySelector('[data-part="pwm"]')?.setAttribute('d', pwmAt(shown));
      const t = (pulse - (PULSE_KNOB_MIN_MS + PULSE_KNOB_MAX_MS) / 2) / ((PULSE_KNOB_MAX_MS - PULSE_KNOB_MIN_MS) / 2);
      svg.querySelector('[data-part="knob-pointer"]')?.setAttribute('d', knobAt(t));
      const readout = host.querySelector('[data-readout]');
      const text = `脉宽 ${s.pulseMs.toFixed(2)}ms · 占空比 ${s.duty.toFixed(1)}% · ${s.angle.toFixed(0)}° · ${(s.current * 1000).toFixed(0)}mA`;
      if (readout && readout.textContent !== text) readout.textContent = text;
      host.setAttribute('aria-valuenow', s.pulseMs.toFixed(2));
      host.setAttribute('aria-valuetext', text);
    };

    if (!motion) {
      smooth.current = pulse;
      paint(pulse);
      return;
    }
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      smooth.current += (pulse - smooth.current) * (1 - Math.exp(-dt / 0.18));
      if (Math.abs(pulse - smooth.current) < 0.002) smooth.current = pulse;
      paint(smooth.current);
      frame = smooth.current === pulse ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pulse, motion]);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    dragging.current = { startY: event.clientY, startPulse: pulse };
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* 无活跃指针（合成事件） */
    }
  }, [pulse]);

  const step = useCallback((delta: number) => {
    setPulse(p => clampPulse(p + delta * PULSE_STEP_MS));
  }, []);

  return (
    <div
      ref={hostRef}
      className="iso"
      data-theme={theme === 'light' ? 'light' : 'dark'}
      role="slider"
      aria-label="SG90 舵机：拖动或方向键调整脉宽，看手臂角度与 PWM 波形"
      aria-valuemin={PULSE_KNOB_MIN_MS}
      aria-valuemax={PULSE_KNOB_MAX_MS}
      aria-valuenow={st.pulseMs}
      tabIndex={0}
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={event => {
        const drag = dragging.current;
        if (!drag) return;
        const delta = Math.round((drag.startY - event.clientY) / 6) * PULSE_STEP_MS;
        setPulse(clampPulse(drag.startPulse + delta));
      }}
      onPointerUp={() => { dragging.current = null; }}
      onPointerCancel={() => { dragging.current = null; }}
      onKeyDown={event => {
        switch (event.key) {
          case 'ArrowUp': case 'ArrowRight': step(1); break;
          case 'ArrowDown': case 'ArrowLeft': step(-1); break;
          case 'Home': setPulse(PULSE_MIN_MS); break;
          case 'End': setPulse(PULSE_MAX_MS); break;
          case ' ': setPulse(1.5); break;
          default: return;
        }
        event.preventDefault();
      }}
      dangerouslySetInnerHTML={{ __html: cardHtml }}
    />
  );
}
