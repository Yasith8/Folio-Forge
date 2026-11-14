import {
  escapeHtml,
  htmlToPlainText,
  isHttpUrl,
  type ResumeContent,
  type ResumeTheme,
} from '@folioforge/shared';
import { PortfolioPage, portfolioCss } from '@folioforge/templates';
import { renderToStaticMarkup } from 'react-dom/server';
import { safeJsonForScript } from './html';

interface PortfolioInput {
  username: string;
  content: ResumeContent;
  theme: ResumeTheme;
  viewCount: number;
  publicUrl: string;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function portfolioDescription(content: ResumeContent): string {
  const summary = content.sections.find((s) => s.type === 'summary' && s.visible);
  const text =
    summary?.type === 'summary' ? htmlToPlainText(summary.content).replace(/\n/g, ' ') : '';
  return truncate(text || content.basics.headline || `${content.basics.name}'s portfolio`, 160);
}

/**
 * Server-rendered portfolio page. The HTML arrives complete with content,
 * <title>, meta description, Open Graph/Twitter tags and JSON-LD, so search
 * engines and link previews (Slack, LinkedIn) see everything without running
 * JavaScript. The page needs no client-side JavaScript at all.
 */
export function renderPortfolioHtml(input: PortfolioInput): string {
  const { basics } = input.content;
  const url = `${input.publicUrl}/u/${encodeURIComponent(input.username)}`;
  const title = basics.headline ? `${basics.name} – ${basics.headline}` : basics.name;
  const description = portfolioDescription(input.content);
  const image = isHttpUrl(basics.photo) ? basics.photo : '';
  const sameAs = [basics.website, ...basics.profiles.map((p) => p.url)].filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: basics.name,
    ...(basics.headline ? { jobTitle: basics.headline } : {}),
    ...(basics.location ? { address: basics.location } : {}),
    url,
    ...(image ? { image } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  const body = renderToStaticMarkup(
    <PortfolioPage content={input.content} theme={input.theme} viewCount={input.viewCount} />,
  );
  const meta = [
    ['description', description],
    ['twitter:card', image ? 'summary_large_image' : 'summary'],
    ['twitter:title', title],
    ['twitter:description', description],
  ];
  const og = [
    ['og:type', 'profile'],
    ['og:title', title],
    ['og:description', description],
    ['og:url', url],
    ['og:site_name', 'FolioForge'],
    ['profile:username', input.username],
    ...(image ? [['og:image', image]] : []),
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${meta.map(([name, content]) => `<meta name="${name}" content="${escapeHtml(content ?? '')}">`).join('\n')}
${og.map(([property, content]) => `<meta property="${property}" content="${escapeHtml(content ?? '')}">`).join('\n')}
<link rel="canonical" href="${escapeHtml(url)}">
<script type="application/ld+json">${safeJsonForScript(jsonLd)}</script>
<style>${portfolioCss(input.theme)}</style>
</head>
<body>${body}</body>
</html>`;
}

export function renderNotFoundHtml(username: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Portfolio not found</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f6f7f9;color:#15181c;padding:1.5rem}
@media (prefers-color-scheme:dark){body{background:#101317;color:#e7e9ec}}
main{max-width:32rem}h1{font-size:1.75rem;margin:0 0 .75rem}p{line-height:1.6;margin:0 0 1rem}a{color:inherit}
</style>
</head>
<body><main>
<h1>No public portfolio at /u/${escapeHtml(username)}</h1>
<p>The link may be mistyped, or its owner has made the portfolio private.</p>
<p><a href="/">Build your own resume with FolioForge</a></p>
</main></body>
</html>`;
}
