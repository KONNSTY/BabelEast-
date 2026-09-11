import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const VARIANT_STYLES = {
  primary: "bg-brand text-white shadow-[0_4px_0_var(--color-brand-shadow)] active:shadow-[0_1px_0_var(--color-brand-shadow)]",
  success: "bg-success text-white shadow-[0_4px_0_#16803c] active:shadow-[0_1px_0_#16803c]",
  danger: "bg-danger text-white shadow-[0_4px_0_#b91c1c] active:shadow-[0_1px_0_#b91c1c]",
  secondary: "bg-white text-slate-700 shadow-[0_4px_0_#cbd5e1] active:shadow-[0_1px_0_#cbd5e1] border-2 border-slate-100",
  ghost: "bg-transparent text-slate-500 shadow-none active:translate-y-0",
} as const;

const SIZE_STYLES = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-base",
  lg: "px-6 py-4 text-base",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT_STYLES;
  size?: keyof typeof SIZE_STYLES;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "touch-target inline-flex items-center justify-center gap-2 rounded-2xl font-black tracking-tight transition-all duration-100",
        "active:translate-y-[3px]",
        "disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    />
  );
});
