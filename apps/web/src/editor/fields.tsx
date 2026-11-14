import { useState } from 'react';
import { Controller, get, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { CheckboxField, TextField } from '../components/ui/Field';
import { RichTextEditor } from './RichTextEditor';
import { fieldId } from './uiStore';

interface BaseProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  owner: string;
  name: Path<T>;
  label: string;
  hint?: string;
  className?: string;
}

function errorOf<T extends FieldValues>(form: UseFormReturn<T>, name: Path<T>): string | undefined {
  const error = get(form.formState.errors, name) as
    { message?: string } | Array<{ message?: string }> | undefined;
  if (!error) return undefined;
  if (Array.isArray(error)) return error.find(Boolean)?.message;
  return error.message;
}

export function FormText<T extends FieldValues>({
  form,
  owner,
  name,
  label,
  hint,
  className,
  required,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
}: BaseProps<T> & {
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <TextField
      id={fieldId(owner, name)}
      label={label}
      hint={hint}
      required={required}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete ?? 'off'}
      disabled={disabled}
      className={className}
      error={errorOf(form, name)}
      registration={form.register(name)}
    />
  );
}

export function FormDate<T extends FieldValues>(props: BaseProps<T> & { disabled?: boolean }) {
  return <FormText {...props} placeholder="2024-03" hint={props.hint ?? 'YYYY-MM or YYYY'} />;
}

export function FormCheckbox<T extends FieldValues>({
  form,
  owner,
  name,
  label,
  hint,
  className,
}: BaseProps<T>) {
  return (
    <CheckboxField
      id={fieldId(owner, name)}
      label={label}
      hint={hint}
      className={className}
      registration={form.register(name)}
    />
  );
}

export function FormRichText<T extends FieldValues>({
  form,
  owner,
  name,
  label,
  hint,
  className,
}: BaseProps<T>) {
  return (
    <div className={className}>
      <Controller
        control={form.control}
        name={name}
        render={({ field, fieldState }) => (
          <RichTextEditor
            id={fieldId(owner, name)}
            label={label}
            hint={hint}
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
    </div>
  );
}

const parseKeywords = (text: string) =>
  text
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

/** Comma-separated keywords stored as a string array. */
export function FormKeywords<T extends FieldValues>({
  form,
  owner,
  name,
  label,
  hint,
  className,
}: BaseProps<T>) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <KeywordsInput
          id={fieldId(owner, name)}
          label={label}
          hint={hint ?? 'Separate with commas'}
          className={className}
          value={(field.value as string[]) ?? []}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={errorOf(form, name)}
        />
      )}
    />
  );
}

function KeywordsInput({
  id,
  label,
  hint,
  className,
  value,
  onChange,
  onBlur,
  error,
}: {
  id: string;
  label: string;
  hint: string;
  className?: string;
  value: string[];
  onChange: (value: string[]) => void;
  onBlur: () => void;
  error?: string;
}) {
  // Keep the raw text locally so typing "React, " does not lose the trailing comma.
  const [text, setText] = useState(() => value.join(', '));
  return (
    <TextField
      id={id}
      label={label}
      hint={hint}
      className={className}
      error={error}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseKeywords(event.target.value));
      }}
      onBlur={() => {
        setText(parseKeywords(text).join(', '));
        onBlur();
      }}
    />
  );
}
