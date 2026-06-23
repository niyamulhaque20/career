export function Card({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 glass ${glow ? 'fancy-card' : 'fancy-card'} ${className}`}>
      {children}
    </div>
  );
}
