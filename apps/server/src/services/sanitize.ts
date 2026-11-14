import { mapRichText, type ResumeContent } from '@folioforge/shared';
import sanitizeHtml from 'sanitize-html';

/**
 * Rich text is rendered as HTML on public pages and in PDFs, so it is
 * sanitized on every write. Only the formatting the editor offers survives.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'li'],
  // rel/target are allowed because transformTags (below) sets them; user values are overwritten.
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    b: 'strong',
    i: 'em',
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
  },
};

export function sanitizeRichText(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS).trim();
}

export function sanitizeContent(content: ResumeContent): ResumeContent {
  return mapRichText(content, sanitizeRichText);
}
