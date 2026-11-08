import { SAMPLE_RESUME_CONTENT, SAMPLE_RESUME_THEME, type ResumeTheme } from '@folioforge/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PortfolioPage, ResumeDocument, resumeCss } from '../src';

const render = (theme: Partial<ResumeTheme> = {}, content = SAMPLE_RESUME_CONTENT) =>
  renderToStaticMarkup(
    <ResumeDocument content={content} theme={{ ...SAMPLE_RESUME_THEME, ...theme }} />,
  );

describe('ResumeDocument', () => {
  it.each(['classic', 'modern', 'minimal'] as const)(
    'renders the %s template with all visible sections',
    (template) => {
      const html = render({ template });
      expect(html).toContain(`ff-t-${template}`);
      expect(html).toContain('Alex Rivera');
      expect(html).toContain('Brightline Health');
      expect(html).toContain('Mar 2023 – Present');
      expect(html).toContain('Volunteering');
    },
  );

  it('marks entries as unbreakable for print', () => {
    expect(render().match(/ff-entry ff-avoid/g)?.length).toBeGreaterThan(4);
  });

  it('ATS mode uses one column, no chips and plain contact lines', () => {
    const html = render({ template: 'modern', atsMode: true });
    expect(html).toContain('ff-t-ats');
    expect(html).not.toContain('ff-columns');
    expect(html).not.toContain('ff-chips');
    expect(html).toContain('Email: alex.rivera@example.com');
    expect(html).toContain('https://github.com/alexrivera/folioforge');
  });

  it('omits hidden sections and hidden items', () => {
    const content = structuredClone(SAMPLE_RESUME_CONTENT);
    const experience = content.sections.find((s) => s.type === 'experience');
    if (experience?.type === 'experience') experience.items[1]!.visible = false;
    content.sections.find((s) => s.type === 'languages')!.visible = false;
    const html = render({}, content);
    expect(html).not.toContain('Pixel &amp; Pine Studio');
    expect(html).not.toContain('Spanish');
  });

  it('builds CSS with the page size, margins and accent', () => {
    const css = resumeCss({
      ...SAMPLE_RESUME_THEME,
      pageSize: 'Letter',
      density: 'compact',
      accentColor: '#123456',
    });
    expect(css).toContain('@page { size: 215.9mm 279.4mm; margin: 12mm; }');
    expect(css).toContain('--ff-accent: #123456');
    expect(resumeCss({ ...SAMPLE_RESUME_THEME, accentColor: 'red;}body{x' })).toContain(
      '--ff-accent: #1f4e79',
    );
  });
});

describe('PortfolioPage', () => {
  it('renders project cards, links and the view count', () => {
    const html = renderToStaticMarkup(
      <PortfolioPage
        content={SAMPLE_RESUME_CONTENT}
        theme={SAMPLE_RESUME_THEME}
        viewCount={1234}
      />,
    );
    expect(html).toContain('pf-card');
    expect(html).toContain('href="https://github.com/alexrivera"');
    expect(html).toContain('1,234 views');
  });
});
