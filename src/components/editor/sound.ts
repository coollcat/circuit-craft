// 编辑器 — WebAudio 音效（可关）：连线咔哒 / 上锡滋 / 过流啪 / 过关和弦
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur: number, type: OscillatorType, gain = 0.12, when = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** 连线成功「咔哒」 */
export function sfxClick() {
  blip(1800, 0.05, 'square', 0.06);
  blip(320, 0.08, 'triangle', 0.1, 0.01);
}
/** 上锡「滋」 */
export function sfxSolder() {
  blip(5200, 0.12, 'sawtooth', 0.03);
}
/** 过流/烧毁「啪」 */
export function sfxPop() {
  blip(140, 0.18, 'square', 0.16);
  blip(90, 0.3, 'sawtooth', 0.1, 0.02);
}
/** 过关和弦 */
export function sfxChord() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, 0.5, 'triangle', 0.09, i * 0.09));
}
