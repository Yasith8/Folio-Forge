import { z } from 'zod';
import {
  checkDateRange,
  dateField,
  emailField,
  idField,
  phoneField,
  photoField,
  requiredText,
  richTextField,
  text,
  urlField,
} from './fields';
import { createId } from './ids';

/* ------------------------------------------------------------------ */
/* Basics (personal info)                                             */
/* ------------------------------------------------------------------ */

export const profileSchema = z.object({
  id: idField,
  network: requiredText(40, 'Name the site, e.g. GitHub', 'Site name'),
  username: text(80, 'Username'),
  url: urlField,
});

export const basicsSchema = z.object({
  name: requiredText(100, 'Add your full name', 'Name'),
  headline: text(120, 'Headline'),
  email: emailField,
  phone: phoneField,
  location: text(120, 'Location'),
  website: urlField,
  photo: photoField,
  profiles: z.array(profileSchema).max(10, 'Add at most 10 links'),
});

/* ------------------------------------------------------------------ */
/* Section items                                                      */
/* ------------------------------------------------------------------ */

const itemBase = { id: idField, visible: z.boolean() };

export const experienceItemSchema = z
  .object({
    ...itemBase,
    position: requiredText(120, 'Add your job title', 'Job title'),
    company: requiredText(120, 'Add the company name', 'Company'),
    location: text(120, 'Location'),
    url: urlField,
    startDate: dateField,
    endDate: dateField,
    current: z.boolean(),
    description: richTextField,
  })
  .superRefine(checkDateRange);

export const educationItemSchema = z
  .object({
    ...itemBase,
    institution: requiredText(120, 'Add the school or university', 'Institution'),
    studyType: text(80, 'Degree'),
    area: text(120, 'Field of study'),
    score: text(40, 'Grade'),
    startDate: dateField,
    endDate: dateField,
    description: richTextField,
  })
  .superRefine(checkDateRange);

export const skillItemSchema = z.object({
  ...itemBase,
  name: requiredText(60, 'Name this skill group, e.g. Frontend', 'Skill name'),
  level: text(40, 'Level'),
  keywords: z
    .array(z.string().max(40, 'Keep each keyword under 40 characters'))
    .max(30, 'Add at most 30 keywords'),
});

export const projectItemSchema = z
  .object({
    ...itemBase,
    name: requiredText(100, 'Add the project name', 'Project name'),
    role: text(80, 'Role'),
    url: urlField,
    repoUrl: urlField,
    startDate: dateField,
    endDate: dateField,
    description: richTextField,
    keywords: z
      .array(z.string().max(40, 'Keep each keyword under 40 characters'))
      .max(20, 'Add at most 20 keywords'),
  })
  .superRefine(checkDateRange);

export const certificationItemSchema = z.object({
  ...itemBase,
  name: requiredText(120, 'Add the certification name', 'Certification'),
  issuer: text(120, 'Issuer'),
  date: dateField,
  url: urlField,
});

export const languageItemSchema = z.object({
  ...itemBase,
  language: requiredText(60, 'Add the language', 'Language'),
  fluency: text(60, 'Fluency'),
});

export const customItemSchema = z.object({
  ...itemBase,
  title: requiredText(120, 'Add a title', 'Title'),
  subtitle: text(120, 'Subtitle'),
  date: text(40, 'Date'),
  url: urlField,
  description: richTextField,
});

/* ------------------------------------------------------------------ */
/* Sections                                                           */
/* ------------------------------------------------------------------ */

const sectionBase = {
  id: idField,
  title: requiredText(60, 'Give this section a title', 'Section title'),
  visible: z.boolean(),
};

export const summarySectionSchema = z.object({
  ...sectionBase,
  type: z.literal('summary'),
  content: richTextField,
});

export const experienceSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('experience'),
  items: z.array(experienceItemSchema).max(50),
});

export const educationSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('education'),
  items: z.array(educationItemSchema).max(30),
});

export const skillsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('skills'),
  items: z.array(skillItemSchema).max(30),
});

export const projectsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('projects'),
  items: z.array(projectItemSchema).max(40),
});

export const certificationsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('certifications'),
  items: z.array(certificationItemSchema).max(40),
});

export const languagesSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('languages'),
  items: z.array(languageItemSchema).max(20),
});

export const customSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('custom'),
  items: z.array(customItemSchema).max(40),
});

export const sectionSchema = z.discriminatedUnion('type', [
  summarySectionSchema,
  experienceSectionSchema,
  educationSectionSchema,
  skillsSectionSchema,
  projectsSectionSchema,
  certificationsSectionSchema,
  languagesSectionSchema,
  customSectionSchema,
]);

export const resumeContentSchema = z
  .object({
    basics: basicsSchema,
    sections: z.array(sectionSchema).max(30, 'A resume can have at most 30 sections'),
  })
  .superRefine((content, ctx) => {
    const seen = new Set<string>();
    content.sections.forEach((section, index) => {
      if (seen.has(section.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sections', index, 'id'],
          message: 'Duplicate section id',
        });
      }
      seen.add(section.id);
    });
  });

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Profile = z.infer<typeof profileSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;
export type CertificationItem = z.infer<typeof certificationItemSchema>;
export type LanguageItem = z.infer<typeof languageItemSchema>;
export type CustomItem = z.infer<typeof customItemSchema>;

export type SummarySection = z.infer<typeof summarySectionSchema>;
export type ExperienceSection = z.infer<typeof experienceSectionSchema>;
export type EducationSection = z.infer<typeof educationSectionSchema>;
export type SkillsSection = z.infer<typeof skillsSectionSchema>;
export type ProjectsSection = z.infer<typeof projectsSectionSchema>;
export type CertificationsSection = z.infer<typeof certificationsSectionSchema>;
export type LanguagesSection = z.infer<typeof languagesSectionSchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;

export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section['type'];
export type ListSection = Exclude<Section, SummarySection>;
export type ListSectionType = ListSection['type'];
export type SectionItem = ListSection['items'][number];
export type ResumeContent = z.infer<typeof resumeContentSchema>;

/** Maps a list section type to its item type. */
export interface ItemTypeMap {
  experience: ExperienceItem;
  education: EducationItem;
  skills: SkillItem;
  projects: ProjectItem;
  certifications: CertificationItem;
  languages: LanguageItem;
  custom: CustomItem;
}
export type ItemOf<T extends ListSectionType> = ItemTypeMap[T];

export const itemSchemas = {
  experience: experienceItemSchema,
  education: educationItemSchema,
  skills: skillItemSchema,
  projects: projectItemSchema,
  certifications: certificationItemSchema,
  languages: languageItemSchema,
  custom: customItemSchema,
} as const;

/* ------------------------------------------------------------------ */
/* Section metadata and factories                                     */
/* ------------------------------------------------------------------ */

export const SECTION_TYPES = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'custom',
] as const satisfies readonly SectionType[];

export const SECTION_META: Record<
  SectionType,
  { label: string; defaultTitle: string; itemLabel: string }
> = {
  summary: { label: 'Summary', defaultTitle: 'Summary', itemLabel: 'summary' },
  experience: { label: 'Experience', defaultTitle: 'Experience', itemLabel: 'position' },
  education: { label: 'Education', defaultTitle: 'Education', itemLabel: 'school' },
  skills: { label: 'Skills', defaultTitle: 'Skills', itemLabel: 'skill group' },
  projects: { label: 'Projects', defaultTitle: 'Projects', itemLabel: 'project' },
  certifications: {
    label: 'Certifications',
    defaultTitle: 'Certifications',
    itemLabel: 'certification',
  },
  languages: { label: 'Languages', defaultTitle: 'Languages', itemLabel: 'language' },
  custom: { label: 'Custom section', defaultTitle: 'Volunteering', itemLabel: 'entry' },
};

export function isListSection(section: Section): section is ListSection {
  return section.type !== 'summary';
}

export function createEmptyItem<T extends ListSectionType>(type: T): ItemOf<T> {
  const base = { id: createId(), visible: true };
  const items: ItemTypeMap = {
    experience: {
      ...base,
      position: '',
      company: '',
      location: '',
      url: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    },
    education: {
      ...base,
      institution: '',
      studyType: '',
      area: '',
      score: '',
      startDate: '',
      endDate: '',
      description: '',
    },
    skills: { ...base, name: '', level: '', keywords: [] },
    projects: {
      ...base,
      name: '',
      role: '',
      url: '',
      repoUrl: '',
      startDate: '',
      endDate: '',
      description: '',
      keywords: [],
    },
    certifications: { ...base, name: '', issuer: '', date: '', url: '' },
    languages: { ...base, language: '', fluency: '' },
    custom: { ...base, title: '', subtitle: '', date: '', url: '', description: '' },
  };
  return items[type];
}

export function createSection(type: SectionType, title?: string): Section {
  const base = { id: createId(), title: title ?? SECTION_META[type].defaultTitle, visible: true };
  if (type === 'summary') return { ...base, type, content: '' };
  return { ...base, type, items: [] } as Section;
}

export function createEmptyBasics(name = '', email = ''): Basics {
  return {
    name,
    headline: '',
    email,
    phone: '',
    location: '',
    website: '',
    photo: '',
    profiles: [],
  };
}

/** The content a brand-new resume starts with. */
export function createStarterContent(name = '', email = ''): ResumeContent {
  return {
    basics: createEmptyBasics(name, email),
    sections: (['summary', 'experience', 'projects', 'skills', 'education'] as const).map((type) =>
      createSection(type),
    ),
  };
}

/** Gives every section and item a fresh id (used when duplicating or importing). */
export function regenerateIds(content: ResumeContent): ResumeContent {
  return {
    basics: {
      ...content.basics,
      profiles: content.basics.profiles.map((p) => ({ ...p, id: createId() })),
    },
    sections: content.sections.map((section) => {
      if (!isListSection(section)) return { ...section, id: createId() };
      return {
        ...section,
        id: createId(),
        items: section.items.map((item) => ({ ...item, id: createId() })),
      } as Section;
    }),
  };
}

/** A one-line description of an item, used in collapsed editor rows and screen reader labels. */
export function describeItem(type: ListSectionType, item: SectionItem): string {
  const parts: string[] = [];
  switch (type) {
    case 'experience': {
      const i = item as ExperienceItem;
      parts.push(i.position, i.company);
      break;
    }
    case 'education': {
      const i = item as EducationItem;
      parts.push(i.institution, [i.studyType, i.area].filter(Boolean).join(' '));
      break;
    }
    case 'skills': {
      const i = item as SkillItem;
      parts.push(i.name);
      break;
    }
    case 'projects': {
      const i = item as ProjectItem;
      parts.push(i.name, i.role);
      break;
    }
    case 'certifications': {
      const i = item as CertificationItem;
      parts.push(i.name, i.issuer);
      break;
    }
    case 'languages': {
      const i = item as LanguageItem;
      parts.push(i.language, i.fluency);
      break;
    }
    case 'custom': {
      const i = item as CustomItem;
      parts.push(i.title, i.subtitle);
      break;
    }
  }
  const label = parts.filter((p) => p && p.trim()).join(', ');
  return label || `Untitled ${SECTION_META[type].itemLabel}`;
}
