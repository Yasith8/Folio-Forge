import {
  formatDateRange,
  formatPartialDate,
  isRichTextEmpty,
  type Basics,
  type ListSection,
  type Section,
} from '@folioforge/shared';

/** A template-agnostic view of one item, so every template renders the same data. */
export interface Entry {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  location: string;
  url: string;
  links: Array<{ label: string; href: string }>;
  html: string;
  keywords: string[];
}

export interface ContactItem {
  key: string;
  label: string;
  /** Plain text used by ATS mode, e.g. "Email: jane@example.com". */
  plain: string;
  href?: string;
}

export function shortUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

export function hasVisibleContent(section: Section): boolean {
  if (!section.visible) return false;
  if (section.type === 'summary') return !isRichTextEmpty(section.content);
  return section.items.some((item) => item.visible);
}

export function visibleSections(sections: Section[]): Section[] {
  return sections.filter(hasVisibleContent);
}

export function contactItems(basics: Basics): ContactItem[] {
  const items: ContactItem[] = [];
  if (basics.email)
    items.push({
      key: 'email',
      label: basics.email,
      plain: `Email: ${basics.email}`,
      href: `mailto:${basics.email}`,
    });
  if (basics.phone) {
    items.push({
      key: 'phone',
      label: basics.phone,
      plain: `Phone: ${basics.phone}`,
      href: `tel:${basics.phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (basics.location)
    items.push({ key: 'location', label: basics.location, plain: `Location: ${basics.location}` });
  if (basics.website) {
    items.push({
      key: 'website',
      label: shortUrl(basics.website),
      plain: `Website: ${basics.website}`,
      href: basics.website,
    });
  }
  for (const profile of basics.profiles) {
    const label = profile.url ? shortUrl(profile.url) : `${profile.network}: ${profile.username}`;
    if (!profile.url && !profile.username) continue;
    items.push({
      key: profile.id,
      label,
      plain: `${profile.network}: ${profile.url || profile.username}`,
      href: profile.url || undefined,
    });
  }
  return items;
}

export function toEntries(section: ListSection): Entry[] {
  const base = { subtitle: '', date: '', location: '', url: '', links: [], html: '', keywords: [] };
  switch (section.type) {
    case 'experience':
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({
          ...base,
          id: i.id,
          title: i.position,
          subtitle: i.company,
          date: formatDateRange(i.startDate, i.endDate, i.current),
          location: i.location,
          url: i.url,
          html: i.description,
        }));
    case 'education':
      return section.items
        .filter((i) => i.visible)
        .map((i) => {
          const degree = [i.studyType, i.area].filter(Boolean).join(', ');
          return {
            ...base,
            id: i.id,
            title: degree || i.institution,
            subtitle: degree ? i.institution : '',
            date: formatDateRange(i.startDate, i.endDate),
            location: i.score ? `Grade: ${i.score}` : '',
            html: i.description,
          };
        });
    case 'projects':
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({
          ...base,
          id: i.id,
          title: i.name,
          subtitle: i.role,
          date: formatDateRange(i.startDate, i.endDate, !i.endDate && !!i.startDate),
          url: i.url,
          links: [
            ...(i.url ? [{ label: shortUrl(i.url), href: i.url }] : []),
            ...(i.repoUrl ? [{ label: shortUrl(i.repoUrl), href: i.repoUrl }] : []),
          ],
          html: i.description,
          keywords: i.keywords,
        }));
    case 'certifications':
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({
          ...base,
          id: i.id,
          title: i.name,
          subtitle: i.issuer,
          date: formatPartialDate(i.date),
          url: i.url,
          links: i.url ? [{ label: shortUrl(i.url), href: i.url }] : [],
        }));
    case 'languages':
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({ ...base, id: i.id, title: i.language, subtitle: i.fluency }));
    case 'skills':
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({
          ...base,
          id: i.id,
          title: i.name,
          subtitle: i.level,
          keywords: i.keywords,
        }));
    case 'custom':
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({
          ...base,
          id: i.id,
          title: i.title,
          subtitle: i.subtitle,
          date: i.date,
          url: i.url,
          links: i.url ? [{ label: shortUrl(i.url), href: i.url }] : [],
          html: i.description,
        }));
  }
}
