import { FONT_PAIRINGS, type ResumeTheme } from '@folioforge/shared';
import { safeAccent } from './resumeCss';

export function portfolioCss(theme: ResumeTheme): string {
  const fonts = FONT_PAIRINGS[theme.fontPairing] ?? FONT_PAIRINGS.sans;
  return `:root {
  --pf-accent: ${safeAccent(theme.accentColor)};
  --pf-bg: #f6f7f9;
  --pf-surface: #ffffff;
  --pf-text: #15181c;
  --pf-muted: #59616b;
  --pf-line: #dfe3e8;
  --pf-heading: ${fonts.heading};
  --pf-body: ${fonts.body};
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --pf-bg: #101317;
    --pf-surface: #171b21;
    --pf-text: #e7e9ec;
    --pf-muted: #a2aab4;
    --pf-line: #2a3039;
    color-scheme: dark;
  }
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--pf-bg); color: var(--pf-text); font-family: var(--pf-body); font-size: 1.0625rem; line-height: 1.6; }
a { color: inherit; }
a:focus-visible { outline: 3px solid var(--pf-accent); outline-offset: 2px; border-radius: 2px; }
h1, h2, h3, p { margin: 0; }
.pf-page { min-height: 100vh; display: flex; flex-direction: column; }
.pf-hero { border-bottom: 1px solid var(--pf-line); background: linear-gradient(var(--pf-surface), var(--pf-surface)) padding-box; }
.pf-hero-inner { max-width: 60rem; margin: 0 auto; padding: 4.5rem 1.5rem 3rem; display: grid; grid-template-columns: auto 1fr; gap: 2rem; align-items: center; }
.pf-photo { width: 7rem; height: 7rem; border-radius: 50%; object-fit: cover; border: 3px solid var(--pf-accent); }
.pf-photo-fallback { display: grid; place-items: center; font-family: var(--pf-heading); font-size: 2.25rem; color: var(--pf-accent); background: color-mix(in srgb, var(--pf-accent) 10%, var(--pf-surface)); }
.pf-name { font-family: var(--pf-heading); font-size: clamp(2.25rem, 6vw, 3.5rem); line-height: 1.05; letter-spacing: -0.02em; }
.pf-headline { margin-top: 0.5rem; font-size: 1.25rem; color: var(--pf-muted); max-width: 40ch; }
.pf-location { margin-top: 0.25rem; color: var(--pf-muted); font-size: 0.95rem; }
.pf-links { list-style: none; padding: 0; margin: 1.25rem 0 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.pf-links a { display: inline-block; padding: 0.4rem 0.9rem; border-radius: 999px; border: 1px solid var(--pf-line); text-decoration: none; font-size: 0.95rem; background: var(--pf-bg); }
.pf-links li:first-child a { background: var(--pf-accent); border-color: var(--pf-accent); color: #fff; }
.pf-links a:hover { border-color: var(--pf-accent); }
.pf-main { flex: 1; width: 100%; max-width: 60rem; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
.pf-section { padding-top: 3rem; }
.pf-section-title { font-family: var(--pf-heading); font-size: 1.6rem; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--pf-accent); display: inline-block; }
.pf-rich { max-width: 68ch; }
.pf-rich p + p, .pf-rich ul { margin-top: 0.6rem; }
.pf-rich ul { padding-left: 1.25rem; }
.pf-rich li::marker { color: var(--pf-accent); }
.pf-rich a { color: var(--pf-accent); }
.pf-muted { color: var(--pf-muted); }
.pf-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 1.25rem; }
.pf-card { background: var(--pf-surface); border: 1px solid var(--pf-line); border-top: 4px solid var(--pf-accent); border-radius: 0.5rem; padding: 1.25rem 1.25rem 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.pf-card-title { font-family: var(--pf-heading); font-size: 1.25rem; }
.pf-card-meta { color: var(--pf-muted); font-size: 0.9rem; }
.pf-card .pf-rich { font-size: 0.98rem; }
.pf-card-links { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; margin-top: auto; padding-top: 0.5rem; font-size: 0.92rem; }
.pf-card-links a { color: var(--pf-accent); text-underline-offset: 3px; }
.pf-tags { list-style: none; margin: 0.25rem 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pf-tags li { font-size: 0.82rem; padding: 0.15rem 0.55rem; border-radius: 0.3rem; background: color-mix(in srgb, var(--pf-accent) 12%, transparent); }
.pf-timeline { list-style: none; padding: 0; margin: 0; }
.pf-timeline-item { display: grid; grid-template-columns: 10rem 1fr; gap: 1.5rem; padding: 1.1rem 0; border-top: 1px solid var(--pf-line); }
.pf-timeline-item:first-child { border-top: 0; padding-top: 0; }
.pf-timeline-date { color: var(--pf-muted); font-size: 0.92rem; font-variant-numeric: tabular-nums; padding-top: 0.15rem; }
.pf-timeline-title { font-size: 1.12rem; }
.pf-timeline-sub { font-weight: 400; color: var(--pf-muted); }
.pf-skills { margin: 0; display: grid; gap: 1rem; }
.pf-skill { display: grid; grid-template-columns: 10rem 1fr; gap: 1.5rem; }
.pf-skill dt { font-weight: 700; }
.pf-skill dd { margin: 0; }
.pf-plain-list { padding: 0; list-style: none; display: grid; gap: 0.35rem; }
.pf-footer { border-top: 1px solid var(--pf-line); padding: 1.5rem; display: flex; justify-content: center; gap: 2rem; color: var(--pf-muted); font-size: 0.9rem; }
@media (max-width: 40rem) {
  .pf-hero-inner { grid-template-columns: 1fr; padding-top: 3rem; gap: 1.25rem; }
  .pf-timeline-item, .pf-skill { grid-template-columns: 1fr; gap: 0.25rem; }
}
@media (prefers-reduced-motion: no-preference) {
  .pf-links a { transition: border-color 120ms ease; }
}`;
}
