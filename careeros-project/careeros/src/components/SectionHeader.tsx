export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
        {sub && <p className="text-sm text-[#475569] mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
