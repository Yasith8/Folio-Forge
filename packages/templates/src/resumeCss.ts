import { ATS_FONT_STACK, DENSITIES, FONT_PAIRINGS, type ResumeTheme } from '@folioforge/shared';
import { pageGeometry } from './geometry';

const BASE_CSS = /* css */ `
*, *::before, *::after { box-sizing: border-box; }
html { background: #ffffff; }
body {
  margin: 0;
  color: #1c1f23;
  background: #ffffff;
  font-family: var(--ff-font-body);
  font-size: var(--ff-size);
  line-height: var(--ff-lh);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  text-rendering: optimizeLegibility;
}
@media screen {
  body { width: var(--ff-page-width); min-height: var(--ff-page-height); padding: var(--ff-margin); }
}
@media print {
  body { width: auto; padding: 0; }
}
a { color: inherit; text-decoration: none; }
h1, h2, h3, p, ul { margin: 0; }
ul { padding: 0; list-style: none; }

.ff-resume { color: #1c1f23; }
.ff-name { font-family: var(--ff-font-heading); font-weight: 700; font-size: 2.1em; line-height: 1.1; letter-spacing: -0.01em; }
.ff-headline { margin-top: calc(var(--ff-space) * 2pt); font-size: 1.15em; color: #3d434a; }
.ff-contact { display: flex; flex-wrap: wrap; gap: 0 calc(var(--ff-space) * 6pt); margin-top: calc(var(--ff-space) * 5pt); font-size: 0.92em; color: #3d434a; }
.ff-contact li { display: inline-flex; gap: calc(var(--ff-space) * 6pt); }
.ff-sep { color: #9aa1a9; }

.ff-section { margin-top: calc(var(--ff-space) * 13pt); }
.ff-section-title {
  font-family: var(--ff-font-heading);
  font-size: 1.12em;
  font-weight: 700;
  color: var(--ff-accent);
  margin-bottom: calc(var(--ff-space) * 5pt);
  break-after: avoid;
  page-break-after: avoid;
}
.ff-avoid { break-inside: avoid; page-break-inside: avoid; }
.ff-entry + .ff-entry { margin-top: calc(var(--ff-space) * 8pt); }
.ff-entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.ff-entry-title { font-weight: 700; }
.ff-entry-sub { font-weight: 400; }
.ff-entry-date { flex: none; font-size: 0.92em; color: #4b5259; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ff-entry-meta { display: flex; flex-wrap: wrap; gap: 0 10pt; font-size: 0.92em; color: #4b5259; }
.ff-entry-meta a { color: var(--ff-accent); }
.ff-entry-keywords { margin-top: 2pt; font-size: 0.9em; color: #4b5259; font-style: italic; }

.ff-rich { margin-top: calc(var(--ff-space) * 2.5pt); }
.ff-rich p + p { margin-top: calc(var(--ff-space) * 3pt); }
.ff-rich ul { list-style: disc; padding-left: 1.2em; }
.ff-rich li + li { margin-top: calc(var(--ff-space) * 1.5pt); }
.ff-rich li::marker { color: var(--ff-accent); }
.ff-rich a { color: var(--ff-accent); text-decoration: underline; text-underline-offset: 1.5pt; }
.ff-rich strong { font-weight: 700; }
.ff-rich em { font-style: italic; }

.ff-skill + .ff-skill { margin-top: calc(var(--ff-space) * 3pt); }
.ff-skill-name { font-weight: 700; }
.ff-skill-level { font-weight: 400; color: #4b5259; }
.ff-skills:not(:has(.ff-chips)) .ff-skill { display: flex; gap: 6pt; }
.ff-skills:not(:has(.ff-chips)) .ff-skill-name::after { content: ':'; }
.ff-chips { display: flex; flex-wrap: wrap; gap: 3pt; margin-top: 3pt; }
.ff-chips li { border: 0.75pt solid color-mix(in srgb, var(--ff-accent) 45%, white); color: #24292f; border-radius: 3pt; padding: 0.5pt 4pt; font-size: 0.88em; }
.ff-language { display: flex; justify-content: space-between; gap: 8pt; }
.ff-language + .ff-language { margin-top: calc(var(--ff-space) * 2pt); }
.ff-language-name { font-weight: 700; }
.ff-language-fluency { color: #4b5259; text-align: right; }

/* Classic --------------------------------------------------------- */
.ff-t-classic .ff-header { text-align: center; padding-bottom: calc(var(--ff-space) * 8pt); border-bottom: 1.5pt solid var(--ff-accent); }
.ff-t-classic .ff-contact { justify-content: center; }
.ff-t-classic .ff-section-title { border-bottom: 0.75pt solid #c9ced4; padding-bottom: 2pt; text-transform: none; }

/* Modern ---------------------------------------------------------- */
.ff-t-modern .ff-header { border-left: 4pt solid var(--ff-accent); padding-left: 10pt; }
.ff-t-modern .ff-headline { color: var(--ff-accent); font-weight: 600; }
.ff-t-modern .ff-columns { display: grid; grid-template-columns: minmax(0, 1fr) 30%; gap: 0 18pt; }
.ff-t-modern .ff-side { border-left: 0.75pt solid #d6dadf; padding-left: 12pt; font-size: 0.95em; }
.ff-t-modern .ff-side .ff-contact { display: block; margin-top: 0; }
.ff-t-modern .ff-side .ff-contact li { display: block; overflow-wrap: anywhere; }
.ff-t-modern .ff-side .ff-contact li + li { margin-top: 2pt; }
.ff-t-modern .ff-side .ff-entry-head { display: block; }
.ff-t-modern .ff-side .ff-entry-at { display: none; }
.ff-t-modern .ff-side .ff-entry-sub { display: block; color: #4b5259; }
.ff-t-modern .ff-main .ff-entry-at { display: none; }
.ff-t-modern .ff-main .ff-entry-sub { display: block; color: var(--ff-accent); font-weight: 600; }
.ff-t-modern .ff-section-title { letter-spacing: 0.02em; }

/* Minimal --------------------------------------------------------- */
.ff-t-minimal .ff-name { font-weight: 400; font-size: 2.3em; letter-spacing: -0.02em; }
.ff-t-minimal .ff-headline { color: #4b5259; }
.ff-t-minimal .ff-section { display: grid; grid-template-columns: 7.2em minmax(0, 1fr); column-gap: 14pt; }
.ff-t-minimal .ff-section > * { grid-column: 2; }
.ff-t-minimal .ff-section > .ff-section-title { grid-column: 1 / -1; font-size: 0.95em; font-weight: 600; color: var(--ff-accent); border: 0; }
.ff-t-minimal .ff-entry { display: grid; grid-column: 1 / -1; grid-template-columns: 7.2em minmax(0, 1fr); column-gap: 14pt; }
.ff-t-minimal .ff-entry > .ff-entry-date { white-space: normal; padding-top: 0.1em; }
.ff-t-minimal .ff-entry-head { display: block; }

/* ATS ------------------------------------------------------------- */
.ff-t-ats, .ff-t-ats * { font-family: ${ATS_FONT_STACK} !important; color: #000 !important; }
.ff-t-ats .ff-name { font-size: 1.8em; letter-spacing: 0; }
.ff-t-ats .ff-headline { font-size: 1.05em; }
.ff-t-ats .ff-contact-line { margin-top: 1pt; }
.ff-t-ats .ff-section-title { font-size: 1.1em; border-bottom: 0.75pt solid #000; padding-bottom: 1pt; }
.ff-t-ats .ff-entry-plain { margin-top: 1pt; }
.ff-t-ats .ff-rich li::marker { color: #000; }
.ff-t-ats .ff-rich a { text-decoration: none; }
`;

/** Theme colors are validated by the schema, but the editor can hold a half-typed value. */
export function safeAccent(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#1f4e79';
}

/** Full stylesheet for a resume with the given theme (page size, margins, fonts, colors). */
export function resumeCss(theme: ResumeTheme): string {
  const { widthMm, heightMm, marginMm } = pageGeometry(theme);
  const density = DENSITIES[theme.density];
  const fonts = FONT_PAIRINGS[theme.fontPairing] ?? FONT_PAIRINGS.sans;
  const accent = safeAccent(theme.accentColor);
  return `@page { size: ${widthMm}mm ${heightMm}mm; margin: ${marginMm}mm; }
:root {
  --ff-accent: ${theme.atsMode ? '#000000' : accent};
  --ff-font-heading: ${theme.atsMode ? ATS_FONT_STACK : fonts.heading};
  --ff-font-body: ${theme.atsMode ? ATS_FONT_STACK : fonts.body};
  --ff-size: ${density.fontSizePt}pt;
  --ff-lh: ${density.lineHeight};
  --ff-space: ${density.spacing};
  --ff-margin: ${marginMm}mm;
  --ff-page-width: ${widthMm}mm;
  --ff-page-height: ${heightMm}mm;
}
${BASE_CSS}`;
}
