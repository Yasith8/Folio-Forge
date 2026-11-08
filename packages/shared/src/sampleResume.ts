import type { ResumeContent } from './resume';
import type { ResumeTheme } from './theme';

/** A filled-in resume used by the seed script, tests and the "start from example" button. */
export const SAMPLE_RESUME_CONTENT: ResumeContent = {
  basics: {
    name: 'Alex Rivera',
    headline: 'Frontend Engineer moving into full-stack',
    email: 'alex.rivera@example.com',
    phone: '+1 (555) 014-2290',
    location: 'Austin, TX',
    website: 'https://alexrivera.dev',
    photo: '',
    profiles: [
      {
        id: 'profile-github',
        network: 'GitHub',
        username: 'alexrivera',
        url: 'https://github.com/alexrivera',
      },
      {
        id: 'profile-linkedin',
        network: 'LinkedIn',
        username: 'alex-rivera',
        url: 'https://www.linkedin.com/in/alex-rivera',
      },
    ],
  },
  sections: [
    {
      id: 'section-summary',
      type: 'summary',
      title: 'Summary',
      visible: true,
      content:
        '<p>Frontend engineer with 2+ years building accessible, data-heavy React and TypeScript apps. Recently shipped my first production Node.js services and enjoy owning features end to end, from database schema to pixel-perfect UI.</p>',
    },
    {
      id: 'section-experience',
      type: 'experience',
      title: 'Experience',
      visible: true,
      items: [
        {
          id: 'exp-1',
          visible: true,
          position: 'Frontend Engineer',
          company: 'Brightline Health',
          location: 'Austin, TX (hybrid)',
          url: 'https://brightline.example.com',
          startDate: '2023-03',
          endDate: '',
          current: true,
          description:
            '<ul><li><p>Rebuilt the patient intake flow in React, TypeScript and React Hook Form, cutting drop-off by <strong>18%</strong>.</p></li><li><p>Introduced TanStack Query and optimistic updates, removing 4,000 lines of hand-rolled caching code.</p></li><li><p>Built an Express + PostgreSQL service for appointment reminders, my first backend feature in production.</p></li></ul>',
        },
        {
          id: 'exp-2',
          visible: true,
          position: 'Junior Web Developer',
          company: 'Pixel & Pine Studio',
          location: 'Remote',
          url: '',
          startDate: '2022-01',
          endDate: '2023-02',
          current: false,
          description:
            '<ul><li><p>Delivered 12 marketing sites for small businesses with a reusable component library.</p></li><li><p>Raised average Lighthouse accessibility score from 78 to 97 across client sites.</p></li></ul>',
        },
      ],
    },
    {
      id: 'section-projects',
      type: 'projects',
      title: 'Projects',
      visible: true,
      items: [
        {
          id: 'proj-1',
          visible: true,
          name: 'FolioForge',
          role: 'Creator',
          url: 'https://folioforge.example.com',
          repoUrl: 'https://github.com/alexrivera/folioforge',
          startDate: '2024-09',
          endDate: '',
          description:
            '<p>Resume builder with live preview, server-side PDF rendering and public portfolio pages.</p><ul><li><p>Express API with session auth, Drizzle ORM and optimistic concurrency for autosave.</p></li><li><p>Headless Chromium renders pixel-perfect PDFs with selectable text.</p></li></ul>',
          keywords: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Playwright'],
        },
        {
          id: 'proj-2',
          visible: true,
          name: 'Trailhead Weather',
          role: 'Solo developer',
          url: 'https://trailhead.example.com',
          repoUrl: '',
          startDate: '2023-06',
          endDate: '2023-08',
          description:
            '<p>Offline-first PWA that caches trail forecasts for hikers with poor reception.</p>',
          keywords: ['PWA', 'Service Workers', 'IndexedDB'],
        },
      ],
    },
    {
      id: 'section-skills',
      type: 'skills',
      title: 'Skills',
      visible: true,
      items: [
        {
          id: 'skill-1',
          visible: true,
          name: 'Frontend',
          level: 'Advanced',
          keywords: ['React', 'TypeScript', 'Tailwind CSS', 'Accessibility'],
        },
        {
          id: 'skill-2',
          visible: true,
          name: 'Backend',
          level: 'Intermediate',
          keywords: ['Node.js', 'Express', 'PostgreSQL', 'REST APIs'],
        },
        {
          id: 'skill-3',
          visible: true,
          name: 'Tooling',
          level: '',
          keywords: ['Vitest', 'Playwright', 'Docker', 'GitHub Actions'],
        },
      ],
    },
    {
      id: 'section-education',
      type: 'education',
      title: 'Education',
      visible: true,
      items: [
        {
          id: 'edu-1',
          visible: true,
          institution: 'University of Texas at Austin',
          studyType: 'B.S.',
          area: 'Information Science',
          score: '',
          startDate: '2017-08',
          endDate: '2021-05',
          description: '',
        },
      ],
    },
    {
      id: 'section-certifications',
      type: 'certifications',
      title: 'Certifications',
      visible: true,
      items: [
        {
          id: 'cert-1',
          visible: true,
          name: 'AWS Certified Cloud Practitioner',
          issuer: 'Amazon Web Services',
          date: '2024-02',
          url: '',
        },
      ],
    },
    {
      id: 'section-languages',
      type: 'languages',
      title: 'Languages',
      visible: true,
      items: [
        { id: 'lang-1', visible: true, language: 'English', fluency: 'Native' },
        {
          id: 'lang-2',
          visible: true,
          language: 'Spanish',
          fluency: 'Professional working proficiency',
        },
      ],
    },
    {
      id: 'section-volunteering',
      type: 'custom',
      title: 'Volunteering',
      visible: true,
      items: [
        {
          id: 'custom-1',
          visible: true,
          title: 'Mentor',
          subtitle: 'Code Austin Bootcamp',
          date: '2023 – present',
          url: '',
          description: '<p>Weekly code reviews and mock interviews for career changers.</p>',
        },
      ],
    },
  ],
};

export const SAMPLE_RESUME_THEME: ResumeTheme = {
  template: 'modern',
  accentColor: '#0f766e',
  fontPairing: 'serif-sans',
  density: 'normal',
  pageSize: 'A4',
  atsMode: false,
};
