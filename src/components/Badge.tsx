export function Badge({ children, color = "#7C6AF7" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
      style={{ background: color + "22", color: color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}
