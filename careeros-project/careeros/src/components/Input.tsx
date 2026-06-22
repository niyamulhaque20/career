export function Input({ value, onChange, placeholder, type = "text", className = "" }: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string; 
  type?: string; 
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] text-white placeholder-[#475569] focus:border-[#7C6AF7] focus:outline-none transition-colors ${className}`}
    />
  );
}
