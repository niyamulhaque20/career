import type { InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  value: string;
  onChange: (val: string) => void;
  className?: string;
};

export function Input({ value, onChange, placeholder, type = "text", className = "", ...props }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full fancy-input text-sm placeholder:subtle focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)] ${className}`}
      {...props}
    />
  );
}
