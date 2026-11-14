import { escapeHtml, type ResumeContent, type ResumeTheme } from '@folioforge/shared';
import { ResumeDocument, resumeCss } from '@folioforge/templates';
import { renderToStaticMarkup } from 'react-dom/server';

/** A complete, self-contained HTML document for the PDF renderer. No external resources. */
export function renderResumeHtml(resume: {
  title: string;
  content: ResumeContent;
  theme: ResumeTheme;
}): string {
  const body = renderToStaticMarkup(
    <ResumeDocument content={resume.content} theme={resume.theme} />,
  );
  const title = [resume.content.basics.name, resume.title].filter(Boolean).join(' – ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${resumeCss(resume.theme)}</style>
</head>
<body>${body}</body>
</html>`;
}
