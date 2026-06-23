export function ProgressBar({ value, max = 100, color = "#7C6AF7", height = 6 }: { 
  value: number; 
  max?: number; 
  color?: string; 
  height?: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "#1E1E2E" }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
    </div>
  );
}
