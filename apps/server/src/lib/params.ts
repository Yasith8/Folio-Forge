import { z } from 'zod';
import { notFound } from './errors';

const uuidSchema = z.uuid();

/** Route ids are UUIDs; anything else cannot exist, so answer 404 instead of a database error. */
export function parseId(value: unknown, what = 'Resume'): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw notFound(`${what} not found.`);
  return result.data;
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'resume'
  );
}
