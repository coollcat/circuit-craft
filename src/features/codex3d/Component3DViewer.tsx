// 图鉴 3D —— 单元件查看器（React 包装层）
// 经 codex3d/index.tsx 以 React.lazy 懒加载：three 只在打开条目详情时进入运行时。
// 职责：挂载/销毁 StudioScene、跟随条目切换模型、把标注锚点投影写给 HTML overlay。
// overlay 定位走 DOM style 直写（每帧），不经过 React 渲染循环。
import { useEffect, useRef } from 'react';
import { StudioScene, STUDIO_BG } from './StudioScene';
import { modelForEntry } from './specs';
import { annotationsFor } from './annotations';
import { cn } from '@/lib/utils';

export interface Component3DViewerProps {
  entryId: string;
  name: string;
  className?: string;
}

export default function Component3DViewer({ entryId, name, className }: Component3DViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const annoLayerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<StudioScene | null>(null);
  const annotations = annotationsFor(entryId);

  // 挂载 / 卸载场景（整个查看器生命周期一个 WebGL 上下文）
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new StudioScene(host);
    sceneRef.current = scene;
    // 投影结果 → 直写标注 DOM（子元素顺序与 annotations 数组一致）
    scene.onProject = pts => {
      const layer = annoLayerRef.current;
      if (!layer) return;
      const els = layer.children;
      for (let i = 0; i < els.length && i < pts.length; i++) {
        const el = els[i] as HTMLElement;
        const p = pts[i];
        el.style.opacity = p.visible ? '1' : '0';
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      }
    };
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
  }, []);

  // 条目切换 → 换展品与标注（复用同一上下文）
  useEffect(() => {
    sceneRef.current?.setComponent(modelForEntry(entryId), annotationsFor(entryId));
  }, [entryId]);

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      style={{ backgroundColor: STUDIO_BG }}
      role="img"
      aria-label={`${name} 3D 实物预览`}
    >
      <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      {/* 旁标注释层（HTML overlay，位置由场景每帧投影直写） */}
      <div ref={annoLayerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {annotations.map((a, i) => (
          <div
            key={i}
            className="absolute left-0 top-0 opacity-0 transition-opacity duration-200"
            style={{ willChange: 'transform' }}
          >
            <span className="absolute -left-[3px] -top-[3px] block h-1.5 w-1.5 rotate-45 border border-white/80 bg-copper-500" />
            <span className="absolute left-1.5 top-[-24px] whitespace-nowrap rounded-sm border border-[#C9BFA8] bg-[#FFFDF6]/95 px-1.5 py-[3px] font-mono text-[10px] leading-none text-[#57534A] shadow-sm">
              {a.text}
            </span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] tracking-[0.2em] text-[#A39C85]">
        STUDIO · LIGHTBOX
      </div>
    </div>
  );
}
