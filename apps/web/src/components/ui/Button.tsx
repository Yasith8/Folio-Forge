import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90 border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-surface-2',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90 dark:text-canvas',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export function buttonClasses(
  variant: Variant = 'secondary',
  size: Size = 'md',
  extra = '',
): string {
  return `inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  busy?: boolean;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  icon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
}

/** Icon-only button. `label` is required so screen readers announce it. */
export function IconButton({
  label,
  children,
  className = '',
  size = 'sm',
  variant = 'ghost',
  ...rest
}: ButtonProps & { label: string }) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={`!px-0 ${size === 'sm' ? 'w-8' : 'w-10'} ${className}`}
      {...rest}
    >
      {children}
    </Button>
  );
}
