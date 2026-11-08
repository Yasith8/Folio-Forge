import { describe, expect, it } from 'vitest';
import {
  createEmptyItem,
  createStarterContent,
  experienceItemSchema,
  formatDateRange,
  formatZodIssues,
  regenerateIds,
  resumeContentSchema,
  resumeThemeSchema,
  SAMPLE_RESUME_CONTENT,
  SAMPLE_RESUME_THEME,
  signupInputSchema,
} from '../src';

describe('resumeContentSchema', () => {
  it('accepts the sample resume', () => {
    expect(resumeContentSchema.safeParse(SAMPLE_RESUME_CONTENT).success).toBe(true);
  });

  it('accepts a starter resume with a name', () => {
    expect(
      resumeContentSchema.safeParse(createStarterContent('Sam Lee', 'sam@example.com')).success,
    ).toBe(true);
  });

  it('requires a name with a helpful message', () => {
    const result = resumeContentSchema.safeParse(createStarterContent('', ''));
    expect(result.success).toBe(false);
    expect(formatZodIssues(result.error!)).toContainEqual({
      path: 'basics.name',
      message: 'Add your full name',
    });
  });

  it('rejects malformed email and links with actionable messages', () => {
    const content = structuredClone(SAMPLE_RESUME_CONTENT);
    content.basics.email = 'alex@';
    content.basics.website = 'alexrivera.dev';
    const issues = formatZodIssues(resumeContentSchema.safeParse(content).error!);
    expect(issues.find((i) => i.path === 'basics.email')?.message).toMatch(/valid email/);
    expect(issues.find((i) => i.path === 'basics.website')?.message).toMatch(/https:\/\//);
  });

  it('rejects duplicate section ids', () => {
    const content = structuredClone(SAMPLE_RESUME_CONTENT);
    content.sections[1]!.id = content.sections[0]!.id;
    expect(resumeContentSchema.safeParse(content).success).toBe(false);
  });

  it('regenerateIds gives every section and item a new id', () => {
    const copy = regenerateIds(SAMPLE_RESUME_CONTENT);
    const ids = (c: typeof copy) =>
      c.sections.flatMap((s) => [s.id, ...('items' in s ? s.items.map((i) => i.id) : [])]);
    const before = new Set(ids(SAMPLE_RESUME_CONTENT));
    expect(ids(copy).some((id) => before.has(id))).toBe(false);
    expect(resumeContentSchema.safeParse(copy).success).toBe(true);
  });
});

describe('item schemas', () => {
  const job = { ...createEmptyItem('experience'), position: 'Engineer', company: 'Acme' };

  it('requires the main fields of a new item', () => {
    const issues = formatZodIssues(
      experienceItemSchema.safeParse(createEmptyItem('experience')).error!,
    );
    expect(issues.map((i) => i.path)).toEqual(expect.arrayContaining(['position', 'company']));
  });

  it('validates partial dates', () => {
    expect(experienceItemSchema.safeParse({ ...job, startDate: '2023-04' }).success).toBe(true);
    expect(experienceItemSchema.safeParse({ ...job, startDate: '2023' }).success).toBe(true);
    const bad = experienceItemSchema.safeParse({ ...job, startDate: '04/2023' });
    expect(formatZodIssues(bad.error!)[0]).toEqual({
      path: 'startDate',
      message: 'Use YYYY or YYYY-MM, e.g. 2023-04',
    });
  });

  it('rejects an end date before the start date, unless the role is current', () => {
    const bad = experienceItemSchema.safeParse({
      ...job,
      startDate: '2023-04',
      endDate: '2022-01',
    });
    expect(formatZodIssues(bad.error!)).toContainEqual({
      path: 'endDate',
      message: 'End date must be on or after the start date',
    });
    expect(
      experienceItemSchema.safeParse({ ...job, startDate: '2023', endDate: '2023-02' }).success,
    ).toBe(true);
    expect(
      experienceItemSchema.safeParse({
        ...job,
        startDate: '2023-04',
        endDate: '2022-01',
        current: true,
      }).success,
    ).toBe(true);
  });
});

describe('theme and auth schemas', () => {
  it('validates theme options', () => {
    expect(resumeThemeSchema.safeParse(SAMPLE_RESUME_THEME).success).toBe(true);
    expect(
      resumeThemeSchema.safeParse({ ...SAMPLE_RESUME_THEME, accentColor: 'teal' }).success,
    ).toBe(false);
    expect(resumeThemeSchema.safeParse({ ...SAMPLE_RESUME_THEME, template: 'fancy' }).success).toBe(
      false,
    );
  });

  it('validates usernames used in public URLs', () => {
    const base = { displayName: 'Sam', email: 'sam@example.com', password: 'long-enough' };
    expect(signupInputSchema.safeParse({ ...base, username: 'sam-lee' }).success).toBe(true);
    expect(signupInputSchema.safeParse({ ...base, username: 'Sam Lee' }).success).toBe(false);
    expect(signupInputSchema.safeParse({ ...base, username: '-sam' }).success).toBe(false);
  });
});

describe('formatDateRange', () => {
  it('formats ranges', () => {
    expect(formatDateRange('2021-04', '2023-01')).toBe('Apr 2021 – Jan 2023');
    expect(formatDateRange('2021-04', '', true)).toBe('Apr 2021 – Present');
    expect(formatDateRange('2019', '')).toBe('2019');
    expect(formatDateRange('', '')).toBe('');
  });
});
