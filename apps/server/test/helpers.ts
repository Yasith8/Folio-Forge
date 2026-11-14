import { SAMPLE_RESUME_CONTENT, type ResumeDto } from '@folioforge/shared';
import request from 'supertest';
import { createApp } from '../src/app';
import { createDatabase, type Database } from '../src/db/client';
import type { PdfRenderer } from '../src/services/pdf';

/** Records the HTML it was asked to print instead of launching Chromium. */
export class FakePdfRenderer implements PdfRenderer {
  lastHtml = '';
  async render(html: string): Promise<Buffer> {
    this.lastHtml = html;
    return Buffer.from('%PDF-1.7\n% fake pdf for tests\n');
  }
  async close(): Promise<void> {}
}

export interface TestContext {
  app: ReturnType<typeof createApp>;
  database: Database;
  pdf: FakePdfRenderer;
}

/** Fresh app backed by an in-memory Postgres (PGlite) with migrations applied. */
export async function createTestContext(): Promise<TestContext> {
  const database = await createDatabase('pglite:memory');
  await database.migrate();
  const pdf = new FakePdfRenderer();
  const app = createApp({
    db: database.db,
    pdf,
    config: {
      nodeEnv: 'test',
      publicUrl: 'http://localhost:3000',
      allowedOrigins: [],
      cookieSecure: false,
      authRateLimit: 1000,
    },
  });
  return { app, database, pdf };
}

let counter = 0;

/** Signs up a new user and returns an agent that keeps the session cookie. */
export async function signUp(
  ctx: TestContext,
  overrides: Partial<{ username: string; email: string }> = {},
) {
  counter += 1;
  const agent = request.agent(ctx.app);
  const credentials = {
    displayName: 'Test User',
    email: overrides.email ?? `user${counter}@example.com`,
    username: overrides.username ?? `user-${counter}`,
    password: 'correct-horse-battery',
  };
  const res = await agent.post('/api/auth/signup').send(credentials).expect(201);
  return {
    agent,
    user: res.body.user as { id: string; username: string; email: string },
    credentials,
  };
}

export async function createFilledResume(
  agent: ReturnType<typeof request.agent>,
  title = 'My resume',
): Promise<ResumeDto> {
  const created = await agent.post('/api/resumes').send({ title }).expect(201);
  const resume = created.body.resume as ResumeDto;
  const saved = await agent
    .put(`/api/resumes/${resume.id}`)
    .send({ title, content: SAMPLE_RESUME_CONTENT, theme: resume.theme, revision: resume.revision })
    .expect(200);
  return saved.body.resume as ResumeDto;
}
