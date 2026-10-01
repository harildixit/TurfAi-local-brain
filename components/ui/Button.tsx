import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import { cx } from './cx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 border-transparent shadow-sm shadow-emerald-500/20',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800/60 border-transparent',
  danger: 'bg-red-500 text-white hover:bg-red-400 border-transparent',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-base rounded-2xl',
};

const Button: FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  type,
  ...rest
}) => {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-bold border transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className="truncate">{children}</span>
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
};

export default Button;

