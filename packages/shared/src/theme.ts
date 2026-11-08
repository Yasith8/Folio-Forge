import { z } from 'zod';
import { hexColorField } from './fields';

export const TEMPLATE_IDS = ['classic', 'modern', 'minimal'] as const;
export const FONT_PAIRING_IDS = ['sans', 'serif', 'calibri', 'serif-sans', 'mono-accent'] as const;
export const DENSITY_IDS = ['compact', 'normal', 'relaxed'] as const;
export const PAGE_SIZE_IDS = ['A4', 'Letter'] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type FontPairingId = (typeof FONT_PAIRING_IDS)[number];
export type DensityId = (typeof DENSITY_IDS)[number];
export type PageSizeId = (typeof PAGE_SIZE_IDS)[number];

export const resumeThemeSchema = z.object({
  template: z.enum(TEMPLATE_IDS),
  accentColor: hexColorField,
  fontPairing: z.enum(FONT_PAIRING_IDS),
  density: z.enum(DENSITY_IDS),
  pageSize: z.enum(PAGE_SIZE_IDS),
  atsMode: z.boolean(),
});

export type ResumeTheme = z.infer<typeof resumeThemeSchema>;

export const DEFAULT_THEME: ResumeTheme = {
  template: 'classic',
  accentColor: '#1f4e79',
  fontPairing: 'serif-sans',
  density: 'normal',
  pageSize: 'A4',
  atsMode: false,
};

export const TEMPLATES: Record<TemplateId, { label: string; description: string }> = {
  classic: {
    label: 'Classic',
    description: 'Centered header and ruled section titles. Familiar to every recruiter.',
  },
  modern: {
    label: 'Modern',
    description: 'Two columns: skills and contact details beside your experience.',
  },
  minimal: {
    label: 'Minimal',
    description: 'Dates in a margin column and generous white space.',
  },
};

/**
 * Font stacks only use fonts that ship with common operating systems or with
 * the Docker image (Liberation, Carlito, Caladea, DejaVu). No web fonts are
 * downloaded, so PDF export works fully offline.
 */
export const FONT_PAIRINGS: Record<
  FontPairingId,
  { label: string; heading: string; body: string }
> = {
  sans: {
    label: 'Helvetica / Arial',
    heading: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
    body: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
  },
  serif: {
    label: 'Cambria / Georgia',
    heading: 'Cambria, Caladea, Georgia, "Liberation Serif", serif',
    body: 'Cambria, Caladea, Georgia, "Liberation Serif", serif',
  },
  calibri: {
    label: 'Calibri',
    heading: 'Calibri, Carlito, "Segoe UI", "Liberation Sans", sans-serif',
    body: 'Calibri, Carlito, "Segoe UI", "Liberation Sans", sans-serif',
  },
  'serif-sans': {
    label: 'Serif headings, sans body',
    heading: 'Cambria, Caladea, Georgia, "Liberation Serif", serif',
    body: 'Calibri, Carlito, "Segoe UI", "Liberation Sans", sans-serif',
  },
  'mono-accent': {
    label: 'Mono headings, sans body',
    heading: 'Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace',
    body: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
  },
};

export const ATS_FONT_STACK = 'Arial, "Liberation Sans", Helvetica, sans-serif';

export const DENSITIES: Record<
  DensityId,
  { label: string; fontSizePt: number; lineHeight: number; spacing: number; marginMm: number }
> = {
  compact: { label: 'Compact', fontSizePt: 9.5, lineHeight: 1.3, spacing: 0.7, marginMm: 12 },
  normal: { label: 'Normal', fontSizePt: 10, lineHeight: 1.4, spacing: 1, marginMm: 15 },
  relaxed: { label: 'Relaxed', fontSizePt: 10.5, lineHeight: 1.5, spacing: 1.3, marginMm: 18 },
};

export const PAGE_SIZES: Record<PageSizeId, { label: string; widthMm: number; heightMm: number }> =
  {
    A4: { label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
    Letter: { label: 'US Letter (8.5 × 11 in)', widthMm: 215.9, heightMm: 279.4 },
  };

export const ACCENT_PRESETS = [
  '#1f4e79',
  '#0f766e',
  '#7c2d12',
  '#6d28d9',
  '#be123c',
  '#334155',
] as const;
