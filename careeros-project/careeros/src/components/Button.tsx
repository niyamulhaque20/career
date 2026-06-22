export function Button({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: "primary" | "secondary" | "danger"; 
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary: "bg-[#7C6AF7] hover:bg-[#6A55E0] text-white",
    secondary: "bg-[#1E1E2E] hover:bg-[#2E2E3E] text-white border border-[#3E3E4E]",
    danger: "bg-[#EF4444] hover:bg-[#DC2626] text-white"
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
