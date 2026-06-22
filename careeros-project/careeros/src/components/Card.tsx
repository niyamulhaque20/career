export function Card({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4 ${glow ? "shadow-[0_0_20px_rgba(124,106,247,0.15)]" : ""} ${className}`}>
      {children}
    </div>
  );
}
