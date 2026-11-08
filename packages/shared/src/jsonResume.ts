import { z } from 'zod';
import { dateField, emailField, normalizeDate, phoneField, photoField, urlField } from './fields';
import { createId } from './ids';
import {
  createEmptyBasics,
  createSection,
  isListSection,
  resumeContentSchema,
  SECTION_META,
  type CertificationItem,
  type CustomItem,
  type EducationItem,
  type ExperienceItem,
  type LanguageItem,
  type ListSectionType,
  type ProjectItem,
  type ResumeContent,
  type Section,
  type SectionItem,
  type SectionType,
  type SkillItem,
} from './resume';
import {
  htmlToPlainText,
  htmlToSummaryAndHighlights,
  summaryAndHighlightsToHtml,
} from './richText';
import { DEFAULT_THEME, resumeThemeSchema, type ResumeTheme } from './theme';

/**
 * JSON Resume (https://jsonresume.org/schema) import/export.
 *
 * Standard fields carry the data, so files work in other JSON Resume tools.
 * FolioForge-only details (theme, section order and titles, hidden items and
 * custom sections) travel in `meta.folioforge` so a round trip is lossless.
 */

export const JSON_RESUME_SCHEMA_URL =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json';

interface LayoutEntry {
  type: SectionType;
  title: string;
  visible: boolean;
  /** Number of items this section contributes to the standard array. */
  itemCount: number;
  /** Indexes (within this section) of hidden items. */
  hiddenItems: number[];
  /** Custom sections have no JSON Resume equivalent, so their items live here. */
  items?: CustomItem[];
  /**
   * Formatted descriptions (bold, links) per item, or the summary HTML. JSON
   * Resume only stores plain text; on import these are used only if the plain
   * text still matches, i.e. the file was not edited in another tool.
   */
  richText?: string[];
}

interface FolioForgeMeta {
  formatVersion: 1;
  title: string;
  theme: ResumeTheme;
  layout: LayoutEntry[];
}

type JsonRecord = Record<string, unknown>;

export interface JsonResume {
  $schema: string;
  basics: JsonRecord;
  work: JsonRecord[];
  education: JsonRecord[];
  skills: JsonRecord[];
  projects: JsonRecord[];
  certificates: JsonRecord[];
  languages: JsonRecord[];
  meta: JsonRecord & { folioforge: FolioForgeMeta };
}

/* ------------------------------------------------------------------ */
/* Export                                                             */
/* ------------------------------------------------------------------ */

const omitEmpty = (record: JsonRecord): JsonRecord =>
  Object.fromEntries(
    Object.entries(record).filter(
      ([, v]) => !(v === '' || v === undefined || (Array.isArray(v) && v.length === 0)),
    ),
  );

export function toJsonResume(resume: {
  title: string;
  content: ResumeContent;
  theme: ResumeTheme;
}): JsonResume {
  const { basics, sections } = resume.content;
  const out: JsonResume = {
    $schema: JSON_RESUME_SCHEMA_URL,
    basics: {},
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
    languages: [],
    meta: {
      version: 'v1.0.0',
      lastModified: new Date().toISOString(),
      folioforge: { formatVersion: 1, title: resume.title, theme: resume.theme, layout: [] },
    },
  };

  const summarySection = sections.find((s) => s.type === 'summary');
  out.basics = omitEmpty({
    name: basics.name,
    label: basics.headline,
    image: basics.photo,
    email: basics.email,
    phone: basics.phone,
    url: basics.website,
    summary: summarySection?.type === 'summary' ? htmlToPlainText(summarySection.content) : '',
    location: basics.location ? { address: basics.location } : undefined,
    profiles: basics.profiles.map((p) =>
      omitEmpty({ network: p.network, username: p.username, url: p.url }),
    ),
  });

  for (const section of sections) {
    const entry: LayoutEntry = {
      type: section.type,
      title: section.title,
      visible: section.visible,
      itemCount: isListSection(section) ? section.items.length : 0,
      hiddenItems: isListSection(section)
        ? section.items.flatMap((item, index) => (item.visible ? [] : [index]))
        : [],
    };
    if (section.type === 'summary') entry.richText = [section.content];
    if (
      section.type === 'experience' ||
      section.type === 'education' ||
      section.type === 'projects'
    ) {
      entry.richText = section.items.map((item) => item.description);
    }
    switch (section.type) {
      case 'summary':
        break;
      case 'experience':
        out.work.push(
          ...section.items.map((i) => {
            const { summary, highlights } = htmlToSummaryAndHighlights(i.description);
            return omitEmpty({
              name: i.company,
              position: i.position,
              location: i.location,
              url: i.url,
              startDate: i.startDate,
              endDate: i.current ? '' : i.endDate,
              summary,
              highlights,
            });
          }),
        );
        break;
      case 'education':
        out.education.push(
          ...section.items.map((i) => {
            const { summary, highlights } = htmlToSummaryAndHighlights(i.description);
            return omitEmpty({
              institution: i.institution,
              area: i.area,
              studyType: i.studyType,
              startDate: i.startDate,
              endDate: i.endDate,
              score: i.score,
              summary,
              courses: highlights,
            });
          }),
        );
        break;
      case 'skills':
        out.skills.push(
          ...section.items.map((i) =>
            omitEmpty({ name: i.name, level: i.level, keywords: i.keywords }),
          ),
        );
        break;
      case 'projects':
        out.projects.push(
          ...section.items.map((i) => {
            const { summary, highlights } = htmlToSummaryAndHighlights(i.description);
            return omitEmpty({
              name: i.name,
              description: summary,
              highlights,
              keywords: i.keywords,
              startDate: i.startDate,
              endDate: i.endDate,
              url: i.url,
              repository: i.repoUrl,
              roles: i.role ? [i.role] : [],
            });
          }),
        );
        break;
      case 'certifications':
        out.certificates.push(
          ...section.items.map((i) =>
            omitEmpty({ name: i.name, issuer: i.issuer, date: i.date, url: i.url }),
          ),
        );
        break;
      case 'languages':
        out.languages.push(
          ...section.items.map((i) => omitEmpty({ language: i.language, fluency: i.fluency })),
        );
        break;
      case 'custom':
        entry.items = section.items;
        break;
    }
    out.meta.folioforge.layout.push(entry);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Import                                                             */
/* ------------------------------------------------------------------ */

export class JsonResumeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonResumeImportError';
  }
}

export interface JsonResumeImportResult {
  title: string;
  content: ResumeContent;
  theme: ResumeTheme;
  warnings: string[];
}

const isRecord = (v: unknown): v is JsonRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (record: JsonRecord, key: string): string => {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
};
const records = (record: JsonRecord, key: string): JsonRecord[] => {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
};
const strings = (record: JsonRecord, key: string): string[] => {
  const value = record[key];
  return Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        .map((v) => v.trim())
    : [];
};

/** JSON Resume dates are ISO-8601 ("2021-04-15", "2021-04", "2021"); we keep year and month. */
function importDate(value: string): string {
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value);
  if (!match) return '';
  const [, year, month] = match;
  if (month && Number(month) >= 1 && Number(month) <= 12) return `${year}-${month}`;
  return year ?? '';
}

export function fromJsonResume(data: unknown): JsonResumeImportResult {
  if (!isRecord(data)) {
    throw new JsonResumeImportError('The file is not a JSON Resume object.');
  }
  const warnings: string[] = [];

  /** Keeps a value if it passes the schema; otherwise drops it and records why. */
  const clean = (schema: z.ZodType<string>, value: string, label: string, max = 1_000): string => {
    let v = value;
    if (v.length > max) {
      v = v.slice(0, max);
      warnings.push(`${label} was shortened to ${max} characters.`);
    }
    if (schema.safeParse(v).success) return v;
    warnings.push(`${label} ("${v.slice(0, 40)}") was not valid and was left empty.`);
    return '';
  };
  const textOf = (value: string, label: string, max: number) =>
    clean(z.string(), value, label, max);
  const required = (value: string, fallback: string, label: string, max: number) => {
    const v = textOf(value, label, max);
    if (v) return v;
    warnings.push(`${label} was missing, so "${fallback}" was used.`);
    return fallback;
  };
  const rich = (summary: string, highlights: string[], label: string) => {
    const html = summaryAndHighlightsToHtml(summary, highlights);
    if (html.length <= 10_000) return html;
    warnings.push(`${label} was too long and was shortened.`);
    return summaryAndHighlightsToHtml(summary.slice(0, 4_000), highlights.slice(0, 10));
  };
  const date = (value: string, label: string) => clean(dateField, importDate(value), label);

  const basicsIn = isRecord(data.basics) ? data.basics : {};
  const locationIn = isRecord(basicsIn.location) ? basicsIn.location : {};
  const location = [
    str(locationIn, 'address'),
    str(locationIn, 'city'),
    str(locationIn, 'region'),
    str(locationIn, 'countryCode'),
  ]
    .filter(Boolean)
    .join(', ');

  const basics = {
    ...createEmptyBasics(),
    name: required(str(basicsIn, 'name'), 'Your Name', 'Name', 100),
    headline: textOf(str(basicsIn, 'label'), 'Headline', 120),
    email: clean(emailField, str(basicsIn, 'email'), 'Email', 254),
    phone: clean(phoneField, str(basicsIn, 'phone'), 'Phone', 40),
    location: textOf(location, 'Location', 120),
    website: clean(urlField, str(basicsIn, 'url') || str(basicsIn, 'website'), 'Website', 500),
    photo: clean(photoField, str(basicsIn, 'image') || str(basicsIn, 'picture'), 'Photo', 400_000),
    profiles: records(basicsIn, 'profiles')
      .slice(0, 10)
      .map((p) => ({
        id: createId(),
        network: required(str(p, 'network'), 'Link', 'Profile network', 40),
        username: textOf(str(p, 'username'), 'Profile username', 80),
        url: clean(urlField, str(p, 'url'), 'Profile link', 500),
      })),
  };

  const items: Record<Exclude<ListSectionType, 'custom'>, SectionItem[]> = {
    experience: records(data, 'work').map((w): ExperienceItem => ({
      id: createId(),
      visible: true,
      position: required(str(w, 'position'), 'Untitled role', 'Job title', 120),
      company: required(str(w, 'name') || str(w, 'company'), 'Unnamed company', 'Company', 120),
      location: textOf(str(w, 'location'), 'Job location', 120),
      url: clean(urlField, str(w, 'url'), 'Company link', 500),
      startDate: date(str(w, 'startDate'), 'Start date'),
      endDate: date(str(w, 'endDate'), 'End date'),
      current: !str(w, 'endDate') && !!str(w, 'startDate'),
      description: rich(str(w, 'summary'), strings(w, 'highlights'), 'A job description'),
    })),
    education: records(data, 'education').map((e): EducationItem => ({
      id: createId(),
      visible: true,
      institution: required(str(e, 'institution'), 'Unnamed school', 'Institution', 120),
      studyType: textOf(str(e, 'studyType'), 'Degree', 80),
      area: textOf(str(e, 'area'), 'Field of study', 120),
      score: textOf(str(e, 'score') || str(e, 'gpa'), 'Grade', 40),
      startDate: date(str(e, 'startDate'), 'Start date'),
      endDate: date(str(e, 'endDate'), 'End date'),
      description: rich(str(e, 'summary'), strings(e, 'courses'), 'An education description'),
    })),
    skills: records(data, 'skills').map((s): SkillItem => ({
      id: createId(),
      visible: true,
      name: required(str(s, 'name'), 'Skills', 'Skill name', 60),
      level: textOf(str(s, 'level'), 'Skill level', 40),
      keywords: strings(s, 'keywords')
        .slice(0, 30)
        .map((k) => k.slice(0, 40)),
    })),
    projects: records(data, 'projects').map((p): ProjectItem => ({
      id: createId(),
      visible: true,
      name: required(str(p, 'name'), 'Untitled project', 'Project name', 100),
      role: textOf(strings(p, 'roles')[0] ?? '', 'Project role', 80),
      url: clean(urlField, str(p, 'url'), 'Project link', 500),
      repoUrl: clean(urlField, str(p, 'repository'), 'Repository link', 500),
      startDate: date(str(p, 'startDate'), 'Start date'),
      endDate: date(str(p, 'endDate'), 'End date'),
      description: rich(str(p, 'description'), strings(p, 'highlights'), 'A project description'),
      keywords: strings(p, 'keywords')
        .slice(0, 20)
        .map((k) => k.slice(0, 40)),
    })),
    certifications: [...records(data, 'certificates'), ...records(data, 'awards')].map(
      (c): CertificationItem => ({
        id: createId(),
        visible: true,
        name: required(str(c, 'name') || str(c, 'title'), 'Certification', 'Certification', 120),
        issuer: textOf(str(c, 'issuer') || str(c, 'awarder'), 'Issuer', 120),
        date: date(str(c, 'date'), 'Certification date'),
        url: clean(urlField, str(c, 'url'), 'Certification link', 500),
      }),
    ),
    languages: records(data, 'languages').map((l): LanguageItem => ({
      id: createId(),
      visible: true,
      language: required(str(l, 'language'), 'Language', 'Language', 60),
      fluency: textOf(str(l, 'fluency'), 'Fluency', 60),
    })),
  };

  // Drop end dates that come before their start dates instead of failing the import.
  for (const item of [...items.experience, ...items.education, ...items.projects] as Array<
    ExperienceItem | EducationItem | ProjectItem
  >) {
    if (
      item.startDate &&
      item.endDate &&
      normalizeDate(item.endDate, 'end') < normalizeDate(item.startDate, 'start')
    ) {
      warnings.push(`An end date (${item.endDate}) was before its start date and was removed.`);
      item.endDate = '';
    }
  }

  const summaryText = str(basicsIn, 'summary');
  const meta =
    isRecord(data.meta) && isRecord(data.meta.folioforge) ? data.meta.folioforge : undefined;
  const themeResult = resumeThemeSchema.safeParse(meta?.theme);
  const theme = themeResult.success ? themeResult.data : DEFAULT_THEME;
  const title =
    typeof meta?.title === 'string' && meta.title.trim()
      ? meta.title.trim().slice(0, 80)
      : `${basics.name}'s resume`;

  const sections =
    meta && Array.isArray(meta.layout)
      ? buildFromLayout(meta.layout, items, summaryText, warnings)
      : buildDefault(items, summaryText);

  const content: ResumeContent = { basics, sections };
  const parsed = resumeContentSchema.safeParse(content);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new JsonResumeImportError(
      `The file could not be converted: ${first?.path.join('.') ?? 'resume'} – ${first?.message ?? 'invalid data'}`,
    );
  }
  return { title, content: parsed.data, theme, warnings };
}

/** What a summary's HTML becomes after a trip through JSON Resume's plain-text `basics.summary`. */
function plainSummaryHtml(html: string): string {
  return summaryAndHighlightsToHtml(htmlToPlainText(html), []);
}

function summarySection(summary: string, title?: string): Section {
  const section = createSection('summary', title);
  return { ...section, content: summary ? summaryAndHighlightsToHtml(summary, []) : '' } as Section;
}

function buildDefault(
  items: Record<Exclude<ListSectionType, 'custom'>, SectionItem[]>,
  summary: string,
): Section[] {
  const sections: Section[] = [];
  if (summary) sections.push(summarySection(summary));
  (
    ['experience', 'projects', 'skills', 'education', 'certifications', 'languages'] as const
  ).forEach((type) => {
    if (items[type].length)
      sections.push({ ...createSection(type), items: items[type] } as Section);
  });
  return sections;
}

function buildFromLayout(
  layout: unknown[],
  items: Record<Exclude<ListSectionType, 'custom'>, SectionItem[]>,
  summary: string,
  warnings: string[],
): Section[] {
  const cursors: Record<string, number> = {};
  const sections: Section[] = [];
  for (const raw of layout) {
    if (!isRecord(raw) || typeof raw.type !== 'string' || !(raw.type in SECTION_META)) continue;
    const type = raw.type as SectionType;
    const title =
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim().slice(0, 60)
        : SECTION_META[type].defaultTitle;
    const visible = raw.visible !== false;
    const hidden = new Set(
      Array.isArray(raw.hiddenItems) ? raw.hiddenItems.filter((n) => typeof n === 'number') : [],
    );

    const richText = Array.isArray(raw.richText) ? raw.richText : [];
    if (type === 'summary') {
      const section = summarySection(summary, title);
      const stored = richText[0];
      if (
        section.type === 'summary' &&
        typeof stored === 'string' &&
        plainSummaryHtml(stored) === section.content
      ) {
        section.content = stored;
      }
      sections.push({ ...section, visible });
      continue;
    }
    if (type === 'custom') {
      const customItems = (Array.isArray(raw.items) ? raw.items : [])
        .filter(isRecord)
        .map((c): CustomItem => ({
          id: createId(),
          visible: c.visible !== false,
          title: str(c, 'title').slice(0, 120) || 'Untitled entry',
          subtitle: str(c, 'subtitle').slice(0, 120),
          date: str(c, 'date').slice(0, 40),
          url: urlField.safeParse(str(c, 'url')).success ? str(c, 'url') : '',
          description: str(c, 'description').slice(0, 10_000),
        }));
      sections.push({ id: createId(), type: 'custom', title, visible, items: customItems });
      continue;
    }
    const count =
      typeof raw.itemCount === 'number' && raw.itemCount >= 0 ? raw.itemCount : items[type].length;
    const start = cursors[type] ?? 0;
    const slice = items[type].slice(start, start + count).map((item, index) => {
      const restored = { ...item, visible: !hidden.has(index) };
      const stored = richText[index];
      if ('description' in restored && typeof stored === 'string' && stored.length <= 10_000) {
        const { summary: text, highlights } = htmlToSummaryAndHighlights(stored);
        if (summaryAndHighlightsToHtml(text, highlights) === restored.description)
          restored.description = stored;
      }
      return restored;
    });
    cursors[type] = start + count;
    sections.push({ id: createId(), type, title, visible, items: slice } as Section);
  }
  // Items not covered by the layout (e.g. the file was edited elsewhere) are kept in a new section.
  (Object.keys(items) as Array<keyof typeof items>).forEach((type) => {
    const rest = items[type].slice(cursors[type] ?? 0);
    if (rest.length) {
      warnings.push(
        `${rest.length} extra ${SECTION_META[type].label.toLowerCase()} entr${rest.length === 1 ? 'y was' : 'ies were'} added in a new section.`,
      );
      sections.push({ ...createSection(type), items: rest } as Section);
    }
  });
  if (summary && !sections.some((s) => s.type === 'summary'))
    sections.unshift(summarySection(summary));
  return sections;
}
