import type { ResumeContent, ResumeTheme } from '@folioforge/shared';
import { pageGeometry, PX_PER_MM, ResumeDocument, resumeCss } from '@folioforge/templates';
import { useDeferredValue, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FRAME_DOC =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><base target="_blank"></head><body></body></html>';
const SHIFT_ATTR = 'data-ff-shift';

/**
 * Emulates Chromium's print pagination on the continuous preview, so page
 * breaks shown here match the PDF closely:
 * - every `.ff-avoid` block that would straddle a page boundary is pushed to the next page;
 * - a section title moves together with its first block (`break-after: avoid`);
 * - content landing in a page's bottom/top margin is pushed below the next top margin.
 * Returns the number of pages, or null when the preview is hidden and cannot be measured.
 */
function paginate(doc: Document, pageHeight: number, margin: number): number | null {
  // A hidden iframe (mobile "Edit" tab) has no layout; measuring it would push everything.
  if (doc.body.getBoundingClientRect().width === 0) return null;
  doc.querySelectorAll<HTMLElement>(`[${SHIFT_ATTR}]`).forEach((el) => {
    el.style.marginTop = '';
    el.removeAttribute(SHIFT_ATTR);
  });
  const contentHeight = pageHeight - 2 * margin;
  const scrollY = doc.defaultView?.scrollY ?? 0;
  const pushIfNeeded = (target: HTMLElement, top: number, bottom: number) => {
    const page = Math.floor(top / pageHeight);
    const contentEnd = page * pageHeight + margin + contentHeight;
    const crosses = bottom > contentEnd && bottom - top <= contentHeight;
    const inMargin = top >= contentEnd || top < page * pageHeight + margin;
    if (!crosses && !inMargin) return;
    const nextStart = (top < page * pageHeight + margin ? page : page + 1) * pageHeight + margin;
    const shift = nextStart - top;
    if (shift <= 0) return;
    const current = parseFloat(doc.defaultView?.getComputedStyle(target).marginTop ?? '0') || 0;
    target.style.marginTop = `${current + shift}px`;
    target.setAttribute(SHIFT_ATTR, '');
  };
  const rect = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY };
  };

  doc.querySelectorAll<HTMLElement>('.ff-section').forEach((section) => {
    const blocks = Array.from(section.querySelectorAll<HTMLElement>('.ff-avoid'));
    const first = blocks[0];
    if (first) {
      // Measured fresh each time: earlier pushes move everything below them.
      pushIfNeeded(section, rect(section).top, rect(first).bottom);
    }
    blocks.slice(1).forEach((block) => {
      const r = rect(block);
      pushIfNeeded(block, r.top, r.bottom);
    });
  });
  const height = doc.body.scrollHeight;
  return Math.max(1, Math.ceil((height - 1) / pageHeight));
}

export function ResumePreview({ content, theme }: { content: ResumeContent; theme: ResumeTheme }) {
  // Deferred so typing stays responsive on long resumes; the preview catches up a frame later.
  const deferredContent = useDeferredValue(content);
  const deferredTheme = useDeferredValue(theme);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameDoc, setFrameDoc] = useState<Document | null>(null);
  const [pages, setPages] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(800);

  const geometry = pageGeometry(deferredTheme);
  const pageWidth = geometry.widthMm * PX_PER_MM;
  const pageHeight = geometry.heightMm * PX_PER_MM;
  const margin = geometry.marginMm * PX_PER_MM;
  const scale = Math.min(1, Math.max(0.3, (availableWidth - 32) / pageWidth));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(
      ([entry]) => entry && setAvailableWidth(entry.contentRect.width),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!frameDoc?.body) return;
    const count = paginate(frameDoc, pageHeight, margin);
    if (count !== null) setPages(count);
    // availableWidth changes when the preview becomes visible, which triggers a fresh measurement.
  }, [frameDoc, deferredContent, deferredTheme, pageHeight, margin, availableWidth]);

  const totalHeight = pages * pageHeight;

  return (
    <div ref={containerRef} className="w-full">
      <p className="mb-3 text-center text-xs text-muted" aria-live="polite">
        {geometry.widthMm === 210 ? 'A4' : 'US Letter'}, {pages} {pages === 1 ? 'page' : 'pages'}
      </p>
      <div className="mx-auto" style={{ width: pageWidth * scale, height: totalHeight * scale }}>
        <div
          className="relative origin-top-left"
          style={{ width: pageWidth, height: totalHeight, transform: `scale(${scale})` }}
        >
          <iframe
            ref={iframeRef}
            title="Resume preview"
            srcDoc={FRAME_DOC}
            // Same-origin so React can render into it; no scripts run inside.
            sandbox="allow-same-origin allow-popups"
            tabIndex={-1}
            onLoad={() => setFrameDoc(iframeRef.current?.contentDocument ?? null)}
            className="block bg-white shadow-[0_1px_3px_rgba(15,23,42,.18),0_12px_32px_-12px_rgba(15,23,42,.35)]"
            style={{ width: pageWidth, height: totalHeight, border: 0 }}
          />
          {Array.from({ length: pages - 1 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="workbench pointer-events-none absolute inset-x-0 flex items-center justify-end"
              style={{ top: (index + 1) * pageHeight - 10, height: 20 }}
            >
              <span className="mr-2 rounded bg-surface px-1.5 text-[11px] font-medium text-muted ring-1 ring-line">
                Page {index + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
      {frameDoc && createPortal(<style>{resumeCss(deferredTheme)}</style>, frameDoc.head)}
      {frameDoc &&
        createPortal(
          <ResumeDocument content={deferredContent} theme={deferredTheme} />,
          frameDoc.body,
        )}
    </div>
  );
}
