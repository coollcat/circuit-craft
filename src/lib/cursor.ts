// 烙铁光标彩蛋：生成 data-URI SVG 光标并注入样式表
// 设置 solderCursor=true 时，画布容器加 SOLDER_CURSOR_CLASS 即生效；
// 按住鼠标（:active）时烙铁轻微旋转，模拟下压施焊。

/** 画布容器加这个 class 即启用烙铁光标 */
export const SOLDER_CURSOR_CLASS = 'cc-solder-canvas';

const STYLE_ID = 'cc-solder-cursor-style';

/** 画一支 32×32 的斜持烙铁（热点在铜头尖端），rotateDeg 为整体旋转角 */
function solderSvgUrl(rotateDeg: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
    `<g transform="rotate(${rotateDeg} 16 16)">` +
    // 铜头（尖端指向左下，热点 6,26）
    `<path d="M2 30 L8 19 L13 24 Z" fill="#E0A458" stroke="#8A5A20" stroke-width="0.8"/>` +
    // 金属杆
    `<rect x="7" y="16" width="12" height="5" rx="1.5" transform="rotate(-45 13 18.5)" fill="#B8BEC6" stroke="#6E747C" stroke-width="0.8"/>` +
    // 胶木手柄
    `<rect x="16" y="5" width="13" height="7.5" rx="3.5" transform="rotate(-45 22.5 8.75)" fill="#4A3220" stroke="#2A1C10" stroke-width="0.8"/>` +
    // 手柄上的 PCB 绿丝印环
    `<rect x="17.5" y="6.5" width="2.5" height="7.5" rx="1" transform="rotate(-45 18.75 10.25)" fill="#3FC47F"/>` +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 6 26`;
}

/** 幂等注入烙铁光标样式（普通 / 按下旋转两档） */
export function ensureSolderCursorStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    `.${SOLDER_CURSOR_CLASS},.${SOLDER_CURSOR_CLASS} *{cursor:${solderSvgUrl(0)},crosshair!important}` +
    `.${SOLDER_CURSOR_CLASS}:active,.${SOLDER_CURSOR_CLASS} *:active{cursor:${solderSvgUrl(-14)},crosshair!important}`;
  document.head.appendChild(style);
}
