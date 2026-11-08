import { describe, expect, it } from 'vitest';
import {
  fromJsonResume,
  JsonResumeImportError,
  resumeContentSchema,
  SAMPLE_RESUME_CONTENT,
  SAMPLE_RESUME_THEME,
  toJsonResume,
  type ResumeContent,
} from '../src';

/** Ids are regenerated on import, so compare everything else. */
function withoutIds(content: ResumeContent): unknown {
  return JSON.parse(
    JSON.stringify(content, (key, value: unknown) => (key === 'id' ? undefined : value)),
  );
}

describe('JSON Resume export', () => {
  const exported = toJsonResume({
    title: 'Frontend roles',
    content: SAMPLE_RESUME_CONTENT,
    theme: SAMPLE_RESUME_THEME,
  });

  it('maps fields to the standard JSON Resume schema', () => {
    expect(exported.basics).toMatchObject({
      name: 'Alex Rivera',
      label: 'Frontend Engineer moving into full-stack',
      email: 'alex.rivera@example.com',
      url: 'https://alexrivera.dev',
      location: { address: 'Austin, TX' },
    });
    expect(exported.basics.summary).toContain('Frontend engineer with 2+ years');
    expect(exported.work[0]).toMatchObject({
      name: 'Brightline Health',
      position: 'Frontend Engineer',
      startDate: '2023-03',
    });
    expect(exported.work[0]).not.toHaveProperty('endDate');
    expect(exported.work[0]!.highlights).toHaveLength(3);
    expect(exported.skills[0]).toEqual({
      name: 'Frontend',
      level: 'Advanced',
      keywords: ['React', 'TypeScript', 'Tailwind CSS', 'Accessibility'],
    });
    expect(exported.projects[0]).toMatchObject({
      name: 'FolioForge',
      roles: ['Creator'],
      repository: 'https://github.com/alexrivera/folioforge',
    });
    expect(exported.certificates).toHaveLength(1);
    expect(exported.languages).toHaveLength(2);
  });

  it('keeps FolioForge-only data in meta', () => {
    expect(exported.meta.folioforge.theme).toEqual(SAMPLE_RESUME_THEME);
    expect(exported.meta.folioforge.layout.map((l) => l.type)).toEqual(
      SAMPLE_RESUME_CONTENT.sections.map((s) => s.type),
    );
  });
});

describe('JSON Resume import', () => {
  it('round-trips a FolioForge export without losing data', () => {
    const content = structuredClone(SAMPLE_RESUME_CONTENT);
    const projects = content.sections.find((s) => s.type === 'projects');
    if (projects?.type === 'projects') projects.items[1]!.visible = false;
    content.sections[content.sections.length - 1]!.visible = false;

    const exported = JSON.parse(
      JSON.stringify(
        toJsonResume({ title: 'Frontend roles', content, theme: SAMPLE_RESUME_THEME }),
      ),
    );
    const imported = fromJsonResume(exported);

    expect(imported.title).toBe('Frontend roles');
    expect(imported.theme).toEqual(SAMPLE_RESUME_THEME);
    expect(imported.warnings).toEqual([]);
    expect(withoutIds(imported.content)).toEqual(withoutIds(content));
  });

  it('imports a resume written by another JSON Resume tool', () => {
    const result = fromJsonResume({
      basics: {
        name: 'Priya Natarajan',
        label: 'Backend Developer',
        email: 'priya@example.org',
        summary: 'I build reliable APIs.',
        location: { city: 'Toronto', region: 'ON', countryCode: 'CA' },
        profiles: [{ network: 'GitHub', username: 'priyan', url: 'https://github.com/priyan' }],
      },
      work: [
        {
          name: 'Northwind',
          position: 'Software Developer',
          startDate: '2020-02-15',
          endDate: '2024-06-30',
          summary: 'Payments team.',
          highlights: ['Cut p99 latency by 40%', 'Led the move to <Postgres 16>'],
        },
      ],
      education: [
        {
          institution: 'University of Waterloo',
          area: 'Computer Science',
          studyType: 'BMath',
          endDate: '2019',
        },
      ],
      skills: [{ name: 'Backend', keywords: ['Go', 'PostgreSQL'] }],
    });

    expect(resumeContentSchema.safeParse(result.content).success).toBe(true);
    expect(result.content.basics.location).toBe('Toronto, ON, CA');
    expect(result.content.sections.map((s) => s.type)).toEqual([
      'summary',
      'experience',
      'skills',
      'education',
    ]);
    const work = result.content.sections[1];
    expect(work?.type === 'experience' && work.items[0]).toMatchObject({
      company: 'Northwind',
      startDate: '2020-02',
      endDate: '2024-06',
      current: false,
    });
    // Text is HTML-escaped when converted to rich text.
    expect(work?.type === 'experience' && work.items[0]!.description).toContain(
      '&lt;Postgres 16&gt;',
    );
  });

  it('drops invalid values with warnings instead of failing', () => {
    const result = fromJsonResume({
      basics: { name: 'Sam', email: 'not-an-email', url: 'javascript:alert(1)' },
      work: [{ position: 'Dev', startDate: '2022-05', endDate: '2021-01' }],
    });
    expect(result.content.basics.email).toBe('');
    expect(result.content.basics.website).toBe('');
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    const work = result.content.sections.find((s) => s.type === 'experience');
    expect(work?.type === 'experience' && work.items[0]).toMatchObject({
      company: 'Unnamed company',
      endDate: '',
    });
  });

  it('rejects data that is not an object', () => {
    expect(() => fromJsonResume([1, 2, 3])).toThrow(JsonResumeImportError);
    expect(() => fromJsonResume('resume')).toThrow(JsonResumeImportError);
  });
});
