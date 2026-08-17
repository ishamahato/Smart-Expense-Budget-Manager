import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import cn from '../../utils/cn';

/** Shared label + error + hint wrapper for every form control. */
function FieldShell({ id, label, error, hint, required, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-rose-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-faint">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, hint, prefix, className, containerClassName, required, ...props },
  ref
) {
  const autoId = useId();
  const id = props.id || autoId;

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-faint">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'input-base',
            prefix && 'pl-7',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, containerClassName, required, children, ...props },
  ref
) {
  const autoId = useId();
  const id = props.id || autoId;

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'input-base appearance-none pr-9',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          aria-hidden
        />
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, containerClassName, required, rows = 3, ...props },
  ref
) {
  const autoId = useId();
  const id = props.id || autoId;

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'input-base resize-y',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        {...props}
      />
    </FieldShell>
  );
});

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink cursor-pointer">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          checked ? 'bg-brand-600 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 shadow-neu-pressed',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          className={cn(
            'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-neu-sm transition-transform duration-200 ease-out',
            checked ? 'translate-x-5.5 bg-white' : 'translate-x-1 bg-surface'
          )}
        />
      </button>
    </div>
  );
}
