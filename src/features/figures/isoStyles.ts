// 教学插图（iso 工坊）—— 样式注入：ISO_CSS 只插一次，站点任何页面都能用
import { ISO_CSS } from './kit/iso-kit';

let injected = false;

export function ensureIsoStyles(): void {
  if (injected || typeof document === 'undefined') return;
  if (document.querySelector('style[data-iso-kit]')) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.dataset.isoKit = 'true';
  style.textContent = ISO_CSS;
  document.head.appendChild(style);
  injected = true;
}
