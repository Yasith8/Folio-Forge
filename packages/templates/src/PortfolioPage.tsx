import {
  isListSection,
  isRichTextEmpty,
  type ResumeContent,
  type ResumeTheme,
  type Section,
} from '@folioforge/shared';
import { contactItems, shortUrl, toEntries, visibleSections, type Entry } from './model';

export interface PortfolioPageProps {
  content: ResumeContent;
  theme: ResumeTheme;
  viewCount: number;
}

function Rich({ html }: { html: string }) {
  if (isRichTextEmpty(html)) return null;
  return <div className="pf-rich" dangerouslySetInnerHTML={{ __html: html }} />;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function ProjectCard({ entry }: { entry: Entry }) {
  return (
    <article className="pf-card">
      <h3 className="pf-card-title">{entry.title}</h3>
      {(entry.subtitle || entry.date) && (
        <p className="pf-card-meta">{[entry.subtitle, entry.date].filter(Boolean).join(', ')}</p>
      )}
      <Rich html={entry.html} />
      {entry.keywords.length > 0 && (
        <ul className="pf-tags" aria-label="Technologies">
          {entry.keywords.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      )}
      {entry.links.length > 0 && (
        <p className="pf-card-links">
          {entry.links.map((link) => (
            <a key={link.href} href={link.href} rel="noopener noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </p>
      )}
    </article>
  );
}

function TimelineEntry({ entry }: { entry: Entry }) {
  return (
    <li className="pf-timeline-item">
      <p className="pf-timeline-date">{entry.date}</p>
      <div>
        <h3 className="pf-timeline-title">
          {entry.title}
          {entry.subtitle && <span className="pf-timeline-sub"> at {entry.subtitle}</span>}
        </h3>
        {entry.location && <p className="pf-muted">{entry.location}</p>}
        <Rich html={entry.html} />
        {entry.links.length > 0 && (
          <p className="pf-card-links">
            {entry.links.map((link) => (
              <a key={link.href} href={link.href} rel="noopener noreferrer" target="_blank">
                {link.label}
              </a>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

function PortfolioSection({ section }: { section: Section }) {
  const headingId = `section-${section.id}`;
  let body;
  if (!isListSection(section)) {
    body = <Rich html={section.content} />;
  } else if (section.type === 'projects') {
    body = (
      <div className="pf-cards">
        {toEntries(section).map((entry) => (
          <ProjectCard key={entry.id} entry={entry} />
        ))}
      </div>
    );
  } else if (section.type === 'skills') {
    body = (
      <dl className="pf-skills">
        {toEntries(section).map((entry) => (
          <div key={entry.id} className="pf-skill">
            <dt>{entry.title}</dt>
            <dd>
              <ul className="pf-tags">
                {entry.keywords.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    );
  } else if (section.type === 'languages') {
    body = (
      <ul className="pf-plain-list">
        {toEntries(section).map((entry) => (
          <li key={entry.id}>
            <strong>{entry.title}</strong>
            {entry.subtitle && <span className="pf-muted">, {entry.subtitle}</span>}
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ol className="pf-timeline">
        {toEntries(section).map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </ol>
    );
  }
  return (
    <section className="pf-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="pf-section-title">
        {section.type === 'summary' ? 'About' : section.title}
      </h2>
      {body}
    </section>
  );
}

/** Public, web-friendly portfolio page rendered on the server at /u/:username. */
export function PortfolioPage({ content, viewCount }: PortfolioPageProps) {
  const { basics } = content;
  const sections = visibleSections(content.sections);
  const links = contactItems(basics).filter((c) => c.key !== 'location' && c.key !== 'phone');
  return (
    <div className="pf-page">
      <header className="pf-hero">
        <div className="pf-hero-inner">
          {basics.photo ? (
            <img
              className="pf-photo"
              src={basics.photo}
              alt={`Portrait of ${basics.name}`}
              width={112}
              height={112}
            />
          ) : (
            <div className="pf-photo pf-photo-fallback" aria-hidden="true">
              {initials(basics.name)}
            </div>
          )}
          <div>
            <h1 className="pf-name">{basics.name}</h1>
            {basics.headline && <p className="pf-headline">{basics.headline}</p>}
            {basics.location && <p className="pf-location">{basics.location}</p>}
            {links.length > 0 && (
              <ul className="pf-links">
                {links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      rel={link.key === 'email' ? undefined : 'noopener noreferrer me'}
                      target={link.key === 'email' ? undefined : '_blank'}
                    >
                      {link.key === 'email'
                        ? 'Email me'
                        : link.key === 'website'
                          ? shortUrl(basics.website)
                          : link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>
      <main className="pf-main">
        {sections.map((section) => (
          <PortfolioSection key={section.id} section={section} />
        ))}
      </main>
      <footer className="pf-footer">
        <p>
          {viewCount.toLocaleString('en-US')} {viewCount === 1 ? 'view' : 'views'}
        </p>
        <p>Built with FolioForge</p>
      </footer>
    </div>
  );
}
