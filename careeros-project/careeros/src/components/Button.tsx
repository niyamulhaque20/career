export function Button({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: "primary" | "secondary" | "danger"; 
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const base = `fancy-btn ${variant === 'primary' ? 'primary' : variant === 'secondary' ? 'secondary' : ''}`;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'} ${className}`}
    >
      {children}
    </button>
  );
}
