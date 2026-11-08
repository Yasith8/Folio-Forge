import type { ResumeContent, Section } from './resume';

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, (match) => ENTITY_MAP[match] ?? match);
}

/** Converts the editor's HTML subset to plain text (used for meta descriptions and JSON Resume). */
export function htmlToPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|ul)>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** True when rich text has no visible content (e.g. "<p></p>"). */
export function isRichTextEmpty(html: string): boolean {
  return htmlToPlainText(html).length === 0;
}

/**
 * Splits editor HTML into JSON Resume's shape: free paragraphs become the
 * summary, bullet points become `highlights`.
 */
export function htmlToSummaryAndHighlights(html: string): {
  summary: string;
  highlights: string[];
} {
  const highlights: string[] = [];
  const withoutLists = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner: string) => {
    for (const li of inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const value = htmlToPlainText(li[1] ?? '');
      if (value) highlights.push(value.replace(/\n/g, ' '));
    }
    return '';
  });
  return { summary: htmlToPlainText(withoutLists), highlights };
}

/** Builds editor HTML from JSON Resume's summary + highlights. */
export function summaryAndHighlightsToHtml(summary?: string, highlights?: string[]): string {
  const paragraphs = (summary ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
  const list = (highlights ?? []).map((h) => h.trim()).filter(Boolean);
  const bullets = list.length
    ? `<ul>${list.map((h) => `<li><p>${escapeHtml(h)}</p></li>`).join('')}</ul>`
    : '';
  return paragraphs + bullets;
}

/** Applies `fn` to every rich-text field in the resume and returns a new object. */
export function mapRichText(content: ResumeContent, fn: (html: string) => string): ResumeContent {
  return {
    basics: content.basics,
    sections: content.sections.map((section): Section => {
      switch (section.type) {
        case 'summary':
          return { ...section, content: fn(section.content) };
        case 'experience':
          return {
            ...section,
            items: section.items.map((i) => ({ ...i, description: fn(i.description) })),
          };
        case 'education':
          return {
            ...section,
            items: section.items.map((i) => ({ ...i, description: fn(i.description) })),
          };
        case 'projects':
          return {
            ...section,
            items: section.items.map((i) => ({ ...i, description: fn(i.description) })),
          };
        case 'custom':
          return {
            ...section,
            items: section.items.map((i) => ({ ...i, description: fn(i.description) })),
          };
        default:
          return section;
      }
    }),
  };
}
