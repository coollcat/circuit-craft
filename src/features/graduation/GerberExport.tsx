/* eslint-disable react-refresh/only-export-components */
// STEP 4a Gerber 导出：老周讲解 + 层查看器（canvas 分层显隐）+ jszip 真实打包下载
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { Layers, Eye, EyeOff, PackageOpen, Download, CheckCircle2 } from 'lucide-react';
import PadButton from '@/components/PadButton';
import SilkTag from '@/components/SilkTag';
import { cn } from '@/lib/utils';
import { useToasts, ToastHost } from './ui';
import { useGrad } from './store';
import { GERBER_FILES } from './gerber';
import type { DialogueLine } from '@/engine/types';

export const STEP4_LINES: DialogueLine[] = [
  { speaker: 'laozhou', text: 'Gerber 不是图片，是工厂的施工图。一层一个文件：顶层铜 GTL、底层铜 GBL、阻焊 GTS、丝印 GTO、钻孔 TXT、板框 GKO……' },
  { speaker: 'laozhou', text: '打包成 zip 发给板厂，他们的 CAM 工程师就按这个开料、钻孔、沉铜。现在，把你的板子导出吧。' },
];

interface LayerDef {
  id: string;
  name: string;
  file: string;
  color: string;
  defaultOn: boolean;
}
const LAYERS: LayerDef[] = [
  { id: 'gto', name: '顶层丝印 GTO', file: 'ESP32-min.GTO', color: '#F2EFE3', defaultOn: true },
  { id: 'gts', name: '顶层阻焊 GTS', file: 'ESP32-min.GTS', color: '#2E9E63', defaultOn: true },
  { id: 'gtl', name: '顶层铜 GTL', file: 'ESP32-min.GTL', color: '#C9803C', defaultOn: true },
  { id: 'txt', name: '钻孔 TXT', file: 'ESP32-min.TXT', color: '#FFB84D', defaultOn: true },
  { id: 'gbl', name: '底层铜 GBL', file: 'ESP32-min.GBL', color: '#5B8DEF', defaultOn: true },
  { id: 'gko', name: '板框 GKO', file: 'ESP32-min.GKO', color: '#E56BD6', defaultOn: true },
];

const CV = { w: 640, h: 440 };
const BX = 60; // 板原点
const BY = 40;
const SC = 9; // px/mm

function drawLayer(ctx: CanvasRenderingContext2D, id: string) {
  const px = (mm: number) => BX + mm * SC;
  const py = (mm: number) => BY + mm * SC;
  switch (id) {
    case 'gko':
      ctx.strokeStyle = '#E56BD6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BX, BY, 60 * SC, 40 * SC);
      break;
    case 'gbl':
      ctx.fillStyle = 'rgba(91,141,239,0.13)';
      ctx.fillRect(BX + 2, BY + 2, 60 * SC - 4, 40 * SC - 4);
      ctx.strokeStyle = 'rgba(91,141,239,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px(2), py(5));
      ctx.lineTo(px(12), py(15));
      ctx.lineTo(px(30), py(15));
      ctx.stroke();
      break;
    case 'gtl': {
      ctx.strokeStyle = '#C9803C';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      const traces: [number, number][][] = [
        [[2, 8], [10, 8], [14, 12], [22, 12]],
        [[24, 12], [32, 12], [36, 16], [44, 16]],
        [[30, 20], [38, 28], [46, 28]],
      ];
      for (const t of traces) {
        ctx.beginPath();
        t.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y))));
        ctx.stroke();
      }
      ctx.fillStyle = '#E0A458';
      for (const [x, y] of [[2, 8], [22, 12], [24, 12], [44, 16], [46, 28], [10, 30]] as [number, number][]) {
        ctx.fillRect(px(x) - 7, py(y) - 5, 14, 10);
      }
      break;
    }
    case 'gts':
      ctx.fillStyle = 'rgba(46,158,99,0.22)';
      ctx.fillRect(BX + 2, BY + 2, 60 * SC - 4, 40 * SC - 4);
      break;
    case 'gto':
      ctx.strokeStyle = '#F2EFE3';
      ctx.lineWidth = 1;
      ctx.strokeRect(px(38), py(6), 20 * SC, 26 * SC);
      ctx.strokeRect(px(1), py(3), 9 * SC, 8 * SC);
      ctx.fillStyle = '#F2EFE3';
      ctx.font = '11px "JetBrains Mono",monospace';
      ctx.fillText('U1 ESP32', px(38), py(5));
      ctx.fillText('J1', px(1), py(2.4));
      ctx.fillText('U3', px(20), py(8.4));
      ctx.fillText('CircuitCraft REV A', px(4), py(38));
      break;
    case 'txt':
      ctx.strokeStyle = '#FFB84D';
      ctx.lineWidth = 1.5;
      for (const [x, y, r] of [[10, 30, 2], [12, 15, 2], [2, 8, 4.5], [44, 16, 4.5]] as [number, number, number][]) {
        ctx.beginPath();
        ctx.arc(px(x), py(y), r * SC * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
  }
}

export default function GerberExport({ visitor, onComplete }: { visitor: boolean; onComplete: () => void }) {
  const exported = useGrad(s => s.gerberExported);
  const set = useGrad(s => s.set);
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYERS.map(l => [l.id, l.defaultOn])),
  );
  const [hover, setHover] = useState<string | null>(null);
  const [stacked, setStacked] = useState(false);
  const [packed, setPacked] = useState<{ name: string; size: number }[] | null>(exported ? GERBER_FILES.map(f => ({ name: f.name, size: f.gen().length })) : null);
  const [downloaded, setDownloaded] = useState(false);
  const [packing, setPacking] = useState(false);
  const [zipReady, setZipReady] = useState(false);
  const { toasts, push } = useToasts();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zipBlob = useRef<Blob | null>(null);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, CV.w, CV.h);
    ctx.fillStyle = '#060A08';
    ctx.fillRect(0, 0, CV.w, CV.h);
    // 从底层到顶层绘制
    const order = ['gko', 'gbl', 'gtl', 'txt', 'gts', 'gto'];
    order.forEach((id, i) => {
      if (!visible[id]) return;
      ctx.save();
      const dimmed = hover && hover !== id;
      ctx.globalAlpha = dimmed ? 0.15 : 1;
      if (stacked) {
        ctx.translate(i * 12 - 30, -i * 10 + 25);
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 10;
      }
      drawLayer(ctx, id);
      ctx.restore();
    });
  }, [visible, hover, stacked]);

  useEffect(() => {
    draw();
  }, [draw]);

  const pack = async () => {
    setPacking(true);
    const zip = new JSZip();
    const files: { name: string; size: number }[] = [];
    for (const f of GERBER_FILES) {
      const content = f.gen();
      zip.file(f.name, content);
      files.push({ name: f.name, size: content.length });
      // 文件逐个「飞入」的节奏
      setPacked([...files]);
      await new Promise(r => setTimeout(r, 220));
    }
    zipBlob.current = await zip.generateAsync({ type: 'blob' });
    setZipReady(true);
    setPacking(false);
    if (!visitor) set({ gerberExported: true });
    push('ok', 'Gerber 打包完成，共 8 个文件');
  };

  const download = () => {
    if (!zipBlob.current) return;
    const url = URL.createObjectURL(zipBlob.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ESP32-min-gerber.zip';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    push('ok', 'zip 已下载——这是真的可以发给板厂的文件');
  };

  return (
    <div className="grid grid-cols-[2fr_3fr] gap-6">
      <ToastHost toasts={toasts} />
      {/* 左：讲解 + 层列表 */}
      <div>
        <SilkTag>STEP 4 / GERBER 导出 FABRICATION OUTPUT</SilkTag>
        <h2 className="mb-2 mt-3 flex items-center gap-2 text-2xl font-black text-silk-100">
          <Layers className="h-6 w-6 text-copper-400" /> 层查看器
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-silk-300">
          Gerber（RS-274X）是 PCB 行业的通用施工图格式：每一层一个文件，工厂的 CAM 软件逐层解读。
          勾选/悬停左侧层列表，像 EDA 软件一样检查你的板子。
        </p>
        <div className="space-y-1.5">
          {LAYERS.map(l => (
            <div
              key={l.id}
              onMouseEnter={() => setHover(l.id)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                'flex items-center gap-2.5 rounded border px-3 py-2 font-mono text-xs transition-colors',
                visible[l.id] ? 'border-ink-600 bg-ink-800' : 'border-ink-700 bg-ink-850 opacity-50',
              )}
            >
              <button onClick={() => setVisible(v => ({ ...v, [l.id]: !v[l.id] }))} aria-label={`切换 ${l.name}`}>
                {visible[l.id] ? <Eye className="h-4 w-4 text-pcb-300" /> : <EyeOff className="h-4 w-4 text-silk-700" />}
              </button>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-silk-100">{l.name}</span>
              <span className="ml-auto text-[10px] text-silk-500">{l.file}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStacked(s => !s)}
          className="mt-3 rounded border border-ink-600 px-3 py-1.5 font-mono text-xs text-silk-300 hover:border-pcb-400"
        >
          {stacked ? '⇲ 切回平面叠加' : '⇱ 层叠 3D 堆叠模式'}
        </button>

        {/* 打包 */}
        <div className="panel-raised mt-5 rounded-lg p-4">
          <h4 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-silk-500">
            <PackageOpen className="h-4 w-4" /> Gerber 打包清单
          </h4>
          {!packing && !zipReady && (
            <PadButton variant="copper" size="M" onClick={pack}>
              📦 {packed ? '重新打包 Gerber（zip 已失效）' : '打包 Gerber（真实生成 RS-274X）'}
            </PadButton>
          )}
          {packed && (
            <div className="space-y-1 font-mono text-[11px]">
              {packed.map(f => (
                <motion.p key={f.name} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex justify-between text-silk-300">
                  <span>
                    <CheckCircle2 className="mr-1.5 inline h-3 w-3 text-pcb-300" />
                    {f.name}
                  </span>
                  <span className="text-silk-500">{f.size} B</span>
                </motion.p>
              ))}
            </div>
          )}
          {zipReady && !packing && (
            <div className="mt-3 flex items-center gap-3">
              <PadButton variant="primary" size="M" onClick={download}>
                <Download className="h-4 w-4" /> {downloaded ? '✅ 已导出 · 再下一次' : '下载 ESP32-min-gerber.zip'}
              </PadButton>
            </div>
          )}
        </div>

        <div className="mt-4">
          {(downloaded || exported || visitor) && packed ? (
            <PadButton variant="primary" size="L" onClick={onComplete}>
              去嘉立创下单 →
            </PadButton>
          ) : (
            <p className="font-mono text-[11px] text-silk-500">打包并下载 Gerber zip 后解锁下单环节</p>
          )}
        </div>
      </div>

      {/* 右：canvas 查看器 */}
      <div>
        <canvas
          ref={canvasRef}
          width={CV.w * 2}
          height={CV.h * 2}
          style={{ width: '100%', height: 'auto' }}
          className="rounded-lg border border-ink-700"
        />
        <p className="mt-2 font-mono text-[10px] text-silk-500">
          {stacked ? '层叠模式：各层等距偏移堆叠（教学示意）' : '平面叠加模式：悬停层列表可高亮单层'} · 板框 60×40mm
        </p>
      </div>
    </div>
  );
}
