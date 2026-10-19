import { money } from '@/lib/format';

type Series = { key: string; label: string; color: string; negativeColor?: string };

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });

/** Plain CSS bar chart. Number() is used only for bar heights (display), never for money math. */
export function BarChart({
  data,
  series,
  height = 220,
}: {
  data: Record<string, string>[];
  series: Series[];
  height?: number;
}) {
  const values = data.flatMap((d) => series.map((s) => Number(d[s.key])));
  const max = Math.max(1, ...values.map(Math.abs));
  const zero = values.some((v) => v < 0) ? 50 : 0; // % from the bottom where the zero line sits
  const scale = (100 - zero) / max;

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-slate-500">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto">Max {money(String(max), false)}</span>
      </div>
      <div className="relative flex gap-1 border-b border-slate-200" style={{ height }}>
        {zero > 0 && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-slate-300"
            style={{ bottom: `${zero}%` }}
          />
        )}
        {data.map((d) => (
          <div key={d.month} className="relative flex-1">
            {series.map((s, i) => {
              const v = Number(d[s.key]);
              const h = Math.abs(v) * scale;
              const w = 100 / series.length;
              return (
                <div
                  key={s.key}
                  title={`${monthLabel(d.month)} · ${s.label}: ${money(d[s.key])}`}
                  className="absolute rounded-t-sm"
                  style={{
                    left: `${i * w + 8 / series.length}%`,
                    width: `${w - 16 / series.length}%`,
                    height: `${h}%`,
                    ...(v >= 0 ? { bottom: `${zero}%` } : { top: `${100 - zero}%` }),
                    background: v < 0 && s.negativeColor ? s.negativeColor : s.color,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] text-slate-400">
        {data.map((d, i) => (
          <div key={d.month} className="flex-1 truncate text-center">
            {data.length <= 12 || i % Math.ceil(data.length / 12) === 0 ? monthLabel(d.month) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
