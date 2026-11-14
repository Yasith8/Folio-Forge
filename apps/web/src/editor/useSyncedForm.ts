import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';

interface Options<T extends FieldValues> {
  schema: z.ZodType<T>;
  values: T;
  onChange: (values: T, field: string | undefined) => void;
  /** Show existing errors immediately (e.g. after undo or an import). Off for brand-new items. */
  validateOnMount: boolean;
}

/**
 * React Hook Form instance whose values stream into the editor store.
 *
 * The store is the source of truth (it powers preview, undo/redo and
 * autosave). The form owns input state and validation messages. When the
 * store changes from outside (undo, restore) the editor bumps a key and the
 * form remounts with fresh default values, so the two never fight.
 */
export function useSyncedForm<T extends FieldValues>({
  schema,
  values,
  onChange,
  validateOnMount,
}: Options<T>): UseFormReturn<T> {
  const form = useForm<T>({
    defaultValues: values as DefaultValues<T>,
    resolver: zodResolver(schema as never) as unknown as Resolver<T>,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const subscription = form.watch((_value, { name }) =>
      onChangeRef.current(form.getValues(), name),
    );
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (validateOnMount) void form.trigger();
    // Only on mount: later validation follows the form's own mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return form;
}
