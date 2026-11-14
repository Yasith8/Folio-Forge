import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

const INPUT =
  'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 shadow-xs transition-colors focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent';

export function inputClasses(invalid?: boolean, extra = ''): string {
  return `${INPUT} ${invalid ? 'border-danger' : 'border-line'} ${extra}`;
}

export function describedBy(id: string, hint?: ReactNode, error?: string): string | undefined {
  return (
    [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  );
}

export function FieldMessages({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: ReactNode;
  error?: string;
}) {
  return (
    <>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  registration?: UseFormRegisterReturn;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  id,
  label,
  error,
  hint,
  registration,
  required,
  className = '',
  ...rest
}: TextFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-muted" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClasses(Boolean(error))}
        {...registration}
        {...rest}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  registration?: UseFormRegisterReturn;
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  registration,
  className = '',
  ...rest
}: TextAreaFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClasses(Boolean(error), 'min-h-24')}
        {...registration}
        {...rest}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  registration?: UseFormRegisterReturn;
}

export function CheckboxField({
  id,
  label,
  hint,
  registration,
  className = '',
  ...rest
}: CheckboxFieldProps) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-line accent-[var(--accent)]"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...registration}
        {...rest}
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
