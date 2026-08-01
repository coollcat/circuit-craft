// StarMeter 星级（design.md 6.6）：铜色描边星，获得时填充 + 内发光
import { cn } from '@/lib/utils';

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2.5 L14.9 8.6 L21.5 9.5 L16.7 14.1 L17.9 20.7 L12 17.5 L6.1 20.7 L7.3 14.1 L2.5 9.5 L9.1 8.6 Z"
        fill={filled ? '#F0C078' : 'none'}
        stroke={filled ? '#F0C078' : '#C9803C'}
        strokeWidth="1.6"
        strokeLinejoin="round"
        style={filled ? { filter: 'drop-shadow(0 0 4px rgba(240,192,120,0.6))' } : undefined}
      />
    </svg>
  );
}

export default function StarMeter({
  value = 0,
  max = 3,
  size = 20,
  labels,
  className,
}: {
  value?: number;
  max?: number;
  size?: number;
  /** 每颗星的条件标注（如「不使用提示」） */
  labels?: string[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-start gap-1.5', className)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="flex flex-col items-center gap-1">
          <Star filled={i < value} size={size} />
          {labels?.[i] && (
            <span className="font-mono text-[10px] leading-tight text-silk-500">
              {labels[i]}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
