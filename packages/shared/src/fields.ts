import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d\s./-]*$/;
const DATE_PATTERN = /^(\d{4}(-(0[1-9]|1[0-2]))?)?$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** A short free-text field. Empty strings are allowed. */
export const text = (max: number, label = 'This field') =>
  z.string().max(max, `${label} must be ${max} characters or fewer`);

/** A required short free-text field. */
export const requiredText = (max: number, message: string, label = 'This field') =>
  text(max, label).refine((v) => v.trim().length > 0, message);

export const urlField = z
  .string()
  .max(500, 'Links must be 500 characters or fewer')
  .refine(
    (v) => v === '' || isHttpUrl(v),
    'Enter a full link starting with https://, e.g. https://example.com',
  );

export const emailField = z
  .string()
  .max(254, 'Email must be 254 characters or fewer')
  .refine((v) => v === '' || EMAIL_PATTERN.test(v), 'Enter a valid email, e.g. jane@example.com');

export const phoneField = z
  .string()
  .max(40, 'Phone must be 40 characters or fewer')
  .regex(PHONE_PATTERN, 'Use digits, spaces, +, -, dots and parentheses only');

/** Partial dates: "2023" or "2023-04". Empty means "not set". */
export const dateField = z.string().regex(DATE_PATTERN, 'Use YYYY or YYYY-MM, e.g. 2023-04');

export const hexColorField = z.string().regex(HEX_COLOR_PATTERN, 'Use a hex color like #1d4ed8');

/** Rich text produced by the editor: a small subset of HTML, sanitized on the server. */
export const richTextField = z
  .string()
  .max(10_000, 'This text is too long (max 10,000 characters of formatted text)');

/** Profile photo: an uploaded image (data URL, max ~300 KB) or an https link. */
export const photoField = z
  .string()
  .max(400_000, 'The photo is too large. Use an image under 300 KB')
  .refine(
    (v) => v === '' || IMAGE_DATA_URL_PATTERN.test(v) || isHttpUrl(v),
    'Upload a PNG, JPEG or WebP image, or paste an https link',
  );

export const idField = z.string().min(1).max(64);

/** Turns a partial date into a comparable "YYYY-MM" value. */
export function normalizeDate(value: string, edge: 'start' | 'end'): string {
  if (value.length === 4) return `${value}-${edge === 'start' ? '01' : '12'}`;
  return value;
}

/**
 * Adds an "end date before start date" error to schemas with a date range.
 * Works on any object with startDate/endDate (and optional `current`).
 */
export function checkDateRange(
  value: { startDate: string; endDate: string; current?: boolean },
  ctx: z.RefinementCtx,
): void {
  if (value.current || !value.startDate || !value.endDate) return;
  if (normalizeDate(value.endDate, 'end') < normalizeDate(value.startDate, 'start')) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date must be on or after the start date',
    });
  }
}
