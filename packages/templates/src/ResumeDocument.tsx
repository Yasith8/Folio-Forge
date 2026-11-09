import {
  isListSection,
  isRichTextEmpty,
  type ResumeContent,
  type ResumeTheme,
  type Section,
} from '@folioforge/shared';
import { Fragment, type ReactNode } from 'react';
import { contactItems, toEntries, visibleSections, type ContactItem, type Entry } from './model';

export interface ResumeDocumentProps {
  content: ResumeContent;
  theme: ResumeTheme;
}

/**
 * Renders a resume. The same component powers the live preview (in the
 * browser), the PDF (server-rendered HTML printed by headless Chromium), so
 * what users see is what they download.
 *
 * Class name contract used by print CSS and the preview's page-break emulation:
 * - `.ff-section` wraps a section; its title should stay with the first item.
 * - `.ff-avoid` marks blocks that must not be split across pages.
 */
export function ResumeDocument({ content, theme }: ResumeDocumentProps) {
  const sections = visibleSections(content.sections);
  const layout = theme.atsMode ? 'ats' : theme.template;
  return (
    <div className={`ff-resume ff-t-${layout}`} data-template={layout}>
      {layout === 'ats' && <AtsLayout content={content} sections={sections} />}
      {layout === 'classic' && <ClassicLayout content={content} sections={sections} />}
      {layout === 'modern' && <ModernLayout content={content} sections={sections} />}
      {layout === 'minimal' && <MinimalLayout content={content} sections={sections} />}
    </div>
  );
}

interface LayoutProps {
  content: ResumeContent;
  sections: Section[];
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */

function Rich({ html }: { html: string }) {
  if (isRichTextEmpty(html)) return null;
  // Rich text is restricted to <p>, <strong>, <em>, <a>, <ul>, <li> and sanitized on the server.
  return <div className="ff-rich" dangerouslySetInnerHTML={{ __html: html }} />;
}

function MaybeLink({ href, children }: { href?: string; children: ReactNode }) {
  return href ? <a href={href}>{children}</a> : <>{children}</>;
}

function ContactList({ items, separator }: { items: ContactItem[]; separator?: string }) {
  if (!items.length) return null;
  return (
    <ul className="ff-contact">
      {items.map((item, index) => (
        <li key={item.key}>
          {separator && index > 0 && (
            <span className="ff-sep" aria-hidden="true">
              {separator}
            </span>
          )}
          <MaybeLink href={item.href}>{item.label}</MaybeLink>
        </li>
      ))}
    </ul>
  );
}

function EntryView({ entry, dateColumn = false }: { entry: Entry; dateColumn?: boolean }) {
  const meta = [entry.location].filter(Boolean);
  const head = (
    <div className="ff-entry-head">
      <div className="ff-entry-heading">
        <span className="ff-entry-title">{entry.title}</span>
        {entry.subtitle && (
          <>
            <span className="ff-entry-at">, </span>
            <span className="ff-entry-sub">{entry.subtitle}</span>
          </>
        )}
      </div>
      {!dateColumn && entry.date && <div className="ff-entry-date">{entry.date}</div>}
    </div>
  );
  const body = (
    <>
      {head}
      {(meta.length > 0 || entry.links.length > 0) && (
        <div className="ff-entry-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
          {entry.links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      )}
      <Rich html={entry.html} />
      {entry.keywords.length > 0 && (
        <div className="ff-entry-keywords">{entry.keywords.join(', ')}</div>
      )}
    </>
  );
  if (dateColumn) {
    return (
      <div className="ff-entry ff-avoid">
        <div className="ff-entry-date">{entry.date}</div>
        <div className="ff-entry-body">{body}</div>
      </div>
    );
  }
  return <div className="ff-entry ff-avoid">{body}</div>;
}

function SkillsView({ entries, chips = false }: { entries: Entry[]; chips?: boolean }) {
  return (
    <div className="ff-skills">
      {entries.map((entry) => (
        <div key={entry.id} className="ff-skill ff-avoid">
          <div className="ff-skill-name">
            {entry.title}
            {entry.subtitle && <span className="ff-skill-level"> ({entry.subtitle})</span>}
          </div>
          {chips ? (
            <ul className="ff-chips">
              {entry.keywords.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          ) : (
            entry.keywords.length > 0 && (
              <div className="ff-skill-keywords">{entry.keywords.join(', ')}</div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

function LanguagesView({ entries }: { entries: Entry[] }) {
  return (
    <div className="ff-languages">
      {entries.map((entry) => (
        <div key={entry.id} className="ff-language ff-avoid">
          <span className="ff-language-name">{entry.title}</span>
          {entry.subtitle && <span className="ff-language-fluency">{entry.subtitle}</span>}
        </div>
      ))}
    </div>
  );
}

function SectionView({
  section,
  dateColumn = false,
  chips = false,
}: {
  section: Section;
  dateColumn?: boolean;
  chips?: boolean;
}) {
  let body: ReactNode;
  if (!isListSection(section)) {
    body = (
      <div className="ff-avoid">
        <Rich html={section.content} />
      </div>
    );
  } else if (section.type === 'skills') {
    body = <SkillsView entries={toEntries(section)} chips={chips} />;
  } else if (section.type === 'languages') {
    body = <LanguagesView entries={toEntries(section)} />;
  } else {
    body = toEntries(section).map((entry) => (
      <EntryView key={entry.id} entry={entry} dateColumn={dateColumn} />
    ));
  }
  return (
    <section className="ff-section" data-section={section.type}>
      <h2 className="ff-section-title">{section.title}</h2>
      {body}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Layouts                                                            */
/* ------------------------------------------------------------------ */

function ClassicLayout({ content, sections }: LayoutProps) {
  const { basics } = content;
  return (
    <>
      <header className="ff-header">
        <h1 className="ff-name">{basics.name}</h1>
        {basics.headline && <p className="ff-headline">{basics.headline}</p>}
        <ContactList items={contactItems(basics)} separator="|" />
      </header>
      {sections.map((section) => (
        <SectionView key={section.id} section={section} />
      ))}
    </>
  );
}

const SIDEBAR_TYPES = new Set<Section['type']>(['skills', 'languages', 'certifications']);

function ModernLayout({ content, sections }: LayoutProps) {
  const { basics } = content;
  const main = sections.filter((s) => !SIDEBAR_TYPES.has(s.type));
  const side = sections.filter((s) => SIDEBAR_TYPES.has(s.type));
  const contacts = contactItems(basics);
  return (
    <>
      <header className="ff-header">
        <h1 className="ff-name">{basics.name}</h1>
        {basics.headline && <p className="ff-headline">{basics.headline}</p>}
      </header>
      <div className="ff-columns">
        <div className="ff-main">
          {main.map((section) => (
            <SectionView key={section.id} section={section} />
          ))}
        </div>
        <aside className="ff-side">
          {contacts.length > 0 && (
            <section className="ff-section" data-section="contact">
              <h2 className="ff-section-title">Contact</h2>
              <div className="ff-avoid">
                <ContactList items={contacts} />
              </div>
            </section>
          )}
          {side.map((section) => (
            <SectionView key={section.id} section={section} chips />
          ))}
        </aside>
      </div>
    </>
  );
}

function MinimalLayout({ content, sections }: LayoutProps) {
  const { basics } = content;
  return (
    <>
      <header className="ff-header">
        <h1 className="ff-name">{basics.name}</h1>
        {basics.headline && <p className="ff-headline">{basics.headline}</p>}
        <ContactList items={contactItems(basics)} separator="/" />
      </header>
      {sections.map((section) => (
        <SectionView key={section.id} section={section} dateColumn />
      ))}
    </>
  );
}

/**
 * ATS-friendly layout: one column, standard headings, plain text contact
 * details and full URLs. No icons, columns, tables or colored graphics.
 */
function AtsLayout({ content, sections }: LayoutProps) {
  const { basics } = content;
  return (
    <>
      <header className="ff-header">
        <h1 className="ff-name">{basics.name}</h1>
        {basics.headline && <p className="ff-headline">{basics.headline}</p>}
        {contactItems(basics).map((item) => (
          <p key={item.key} className="ff-contact-line">
            {item.plain}
          </p>
        ))}
      </header>
      {sections.map((section) => {
        if (!isListSection(section) || section.type === 'skills' || section.type === 'languages') {
          return <SectionView key={section.id} section={section} />;
        }
        return (
          <section key={section.id} className="ff-section" data-section={section.type}>
            <h2 className="ff-section-title">{section.title}</h2>
            {toEntries(section).map((entry) => (
              <div key={entry.id} className="ff-entry ff-avoid">
                <p className="ff-entry-title">
                  {[entry.title, entry.subtitle].filter(Boolean).join(', ')}
                </p>
                {(entry.date || entry.location) && (
                  <p className="ff-entry-plain">
                    {[entry.date, entry.location].filter(Boolean).join(', ')}
                  </p>
                )}
                {entry.links.map((link) => (
                  <p key={link.href} className="ff-entry-plain">
                    {link.href}
                  </p>
                ))}
                <Rich html={entry.html} />
                {entry.keywords.length > 0 && (
                  <p className="ff-entry-plain">
                    <Fragment>Technologies: {entry.keywords.join(', ')}</Fragment>
                  </p>
                )}
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
