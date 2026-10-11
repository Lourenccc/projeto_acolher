'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskDateInput } from '@/lib/dates';

const controlBase =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

const controlState = (invalid: boolean) =>
  invalid
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, required, className, children }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-xs font-medium text-red-700">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function a11yProps(id: string, error?: string, hint?: ReactNode, required?: boolean) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
    'aria-required': required || undefined,
  };
}

interface BaseFieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
  /** Recebe o foco ao abrir um modal. */
  autoFocusOnOpen?: boolean;
}

/* --------------------------------- Texto --------------------------------- */

export type TextFieldProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, containerClassName, autoFocusOnOpen, id, className, required, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <input
        ref={ref}
        {...a11yProps(fieldId, error, hint, required)}
        data-autofocus={autoFocusOnOpen || undefined}
        className={cn(controlBase, controlState(!!error), className)}
        {...rest}
      />
    </FieldShell>
  );
});

/* ---------------------------- Data DD/MM/AAAA ---------------------------- */

export type DateFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Campo de data com máscara DD/MM/AAAA, independente do idioma do navegador. */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { value, onValueChange, hint = 'Formato DD/MM/AAAA', ...rest },
  ref,
) {
  return (
    <TextField
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      placeholder="DD/MM/AAAA"
      maxLength={10}
      value={value}
      onChange={(e) => onValueChange(maskDateInput(e.target.value))}
      hint={hint}
      {...rest}
    />
  );
});

/* -------------------------------- Seleção -------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: SelectOption[];
    placeholder?: string;
  };

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, containerClassName, autoFocusOnOpen, id, className, required, options, placeholder, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <select
        ref={ref}
        {...a11yProps(fieldId, error, hint, required)}
        data-autofocus={autoFocusOnOpen || undefined}
        className={cn(controlBase, controlState(!!error), 'pr-8', className)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

/* ------------------------------ Texto longo ------------------------------ */

export type TextareaFieldProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, error, hint, containerClassName, autoFocusOnOpen, id, className, required, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <textarea
        ref={ref}
        {...a11yProps(fieldId, error, hint, required)}
        data-autofocus={autoFocusOnOpen || undefined}
        className={cn(controlBase, controlState(!!error), 'min-h-[80px]', className)}
        {...rest}
      />
    </FieldShell>
  );
});

/* ------------------------------- Checkbox -------------------------------- */

interface CheckboxFieldProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function CheckboxField({ label, description, checked, onChange, disabled, id }: CheckboxFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <input
        id={fieldId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={description ? `${fieldId}-desc` : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      />
      <div className="text-sm">
        <label htmlFor={fieldId} className="font-medium text-slate-700">
          {label}
        </label>
        {description && (
          <p id={`${fieldId}-desc`} className="text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Radio group ------------------------------ */

interface RadioGroupProps<T extends string> {
  legend: ReactNode;
  name: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string }>;
  onChange: (value: T) => void;
  error?: string;
  inline?: boolean;
}

export function RadioGroup<T extends string>({ legend, name, value, options, onChange, error, inline }: RadioGroupProps<T>) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium text-slate-700">{legend}</legend>
      <div className={cn('gap-2', inline ? 'flex flex-wrap' : 'grid')}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-brand-500/40',
              value === o.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 accent-brand-600 focus:outline-none"
            />
            <span>
              <span className="font-medium text-slate-800">{o.label}</span>
              {o.description && <span className="block text-xs text-slate-500">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
