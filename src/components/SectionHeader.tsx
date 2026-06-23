export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl section-title text-white">{title}</h2>
        {sub && <p className="text-sm subtle mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
