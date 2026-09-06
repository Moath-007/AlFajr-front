interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  type: 'bar' | 'donut' | 'line';
  data: ChartData[];
  color?: string;
}

export function Chart({ type, data, color = '#162E21' }: ChartProps) {
  if (type === 'bar') {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 text-xs text-stone-500 text-left shrink-0 truncate">{d.label}</div>
            <div className="flex-1 h-8 rounded-lg bg-stone-100 overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || color, minWidth: d.value > 0 ? '2rem' : 0 }}
              >
                <span className="text-xs font-bold text-white">{d.value > 0 ? d.value : ''}</span>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-stone-400 text-center py-8">لا توجد بيانات</p>}
      </div>
    );
  }

  if (type === 'donut') {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return <p className="text-sm text-stone-400 text-center py-8">لا توجد بيانات</p>;
    let offset = 0;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="flex items-center gap-6 flex-wrap justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#f5f5f4" strokeWidth="20" />
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={i}
                cx="80" cy="80" r={radius} fill="none"
                stroke={d.color || color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.5s' }}
              />
            );
            offset += dash;
            return circle;
          })}
          <text x="80" y="76" textAnchor="middle" className="text-2xl font-extrabold" fill="#162E21">{total}</text>
          <text x="80" y="94" textAnchor="middle" className="text-xs" fill="#a8a29e">إجمالي</text>
        </svg>
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color || color }} />
              <span className="text-stone-600 font-bold">{d.label}</span>
              <span className="text-stone-400">({d.value})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
