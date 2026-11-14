import { SAMPLE_RESUME_CONTENT, type ResumeDto } from '@folioforge/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFilledResume, createTestContext, signUp, type TestContext } from './helpers';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.database.close();
});

describe('resume CRUD', () => {
  it('requires authentication', async () => {
    await request(ctx.app).get('/api/resumes').expect(401);
  });

  it('creates a starter resume pre-filled with the user name and email', async () => {
    const { agent, credentials } = await signUp(ctx);
    const res = await agent.post('/api/resumes').send({ title: 'Frontend roles' }).expect(201);
    expect(res.body.resume).toMatchObject({
      title: 'Frontend roles',
      revision: 1,
      isPublic: false,
    });
    expect(res.body.resume.content.basics).toMatchObject({
      name: 'Test User',
      email: credentials.email,
    });
    const list = await agent.get('/api/resumes').expect(200);
    expect(list.body.resumes).toHaveLength(1);
    expect(list.body.resumes[0]).toMatchObject({ title: 'Frontend roles', template: 'classic' });
  });

  it('saves with optimistic concurrency and rejects stale revisions', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent);
    expect(resume.revision).toBe(2);

    const stale = await agent
      .put(`/api/resumes/${resume.id}`)
      .send({ title: 'Other tab', content: resume.content, theme: resume.theme, revision: 1 })
      .expect(409);
    expect(stale.body.error.code).toBe('revision_conflict');

    const ok = await agent
      .put(`/api/resumes/${resume.id}`)
      .send({ title: 'Renamed', content: resume.content, theme: resume.theme, revision: 2 })
      .expect(200);
    expect(ok.body.resume).toMatchObject({ title: 'Renamed', revision: 3 });
  });

  it('rejects invalid content with the path of each problem', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent);
    const content = structuredClone(resume.content);
    content.basics.email = 'not-an-email';
    const res = await agent
      .put(`/api/resumes/${resume.id}`)
      .send({ title: resume.title, content, theme: resume.theme, revision: resume.revision })
      .expect(400);
    expect(res.body.error.details).toContainEqual({
      path: 'content.basics.email',
      message: 'Enter a valid email, e.g. jane@example.com',
    });
  });

  it('sanitizes rich text before storing it', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent);
    const content = structuredClone(resume.content);
    const summary = content.sections.find((s) => s.type === 'summary');
    if (summary?.type === 'summary') {
      summary.content =
        '<p onclick="steal()">Hi <script>alert(1)</script><a href="javascript:alert(1)">x</a> <a href="https://ok.example">ok</a><img src=x></p>';
    }
    const res = await agent
      .put(`/api/resumes/${resume.id}`)
      .send({ title: resume.title, content, theme: resume.theme, revision: resume.revision })
      .expect(200);
    const saved = (res.body.resume as ResumeDto).content.sections.find((s) => s.type === 'summary');
    const html = saved?.type === 'summary' ? saved.content : '';
    expect(html).not.toMatch(/script|onclick|javascript:|<img/);
    expect(html).toContain(
      '<a href="https://ok.example" rel="noopener noreferrer nofollow" target="_blank">ok</a>',
    );
  });

  it("hides other users' resumes behind 404", async () => {
    const owner = await signUp(ctx);
    const intruder = await signUp(ctx);
    const resume = await createFilledResume(owner.agent);
    await intruder.agent.get(`/api/resumes/${resume.id}`).expect(404);
    await intruder.agent.delete(`/api/resumes/${resume.id}`).expect(404);
    await intruder.agent.get('/api/resumes/not-a-uuid').expect(404);
  });

  it('duplicates and deletes resumes', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent, 'Original');
    const copy = (await agent.post(`/api/resumes/${resume.id}/duplicate`).expect(201)).body
      .resume as ResumeDto;
    expect(copy.title).toBe('Original (copy)');
    expect(copy.id).not.toBe(resume.id);
    expect(copy.content.basics.name).toBe(resume.content.basics.name);
    expect(copy.content.sections[0]!.id).not.toBe(resume.content.sections[0]!.id);
    await agent.delete(`/api/resumes/${resume.id}`).expect(204);
    const list = await agent.get('/api/resumes').expect(200);
    expect(list.body.resumes.map((r: ResumeDto) => r.id)).toEqual([copy.id]);
  });
});

describe('version history', () => {
  it('saves snapshots and restores them, backing up the current state first', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent);
    await agent
      .post(`/api/resumes/${resume.id}/versions`)
      .send({ label: 'Before tailoring' })
      .expect(201);

    const edited = structuredClone(resume.content);
    edited.basics.headline = 'Tailored for Acme';
    const saved = (
      await agent
        .put(`/api/resumes/${resume.id}`)
        .send({
          title: 'Tailored',
          content: edited,
          theme: { ...resume.theme, template: 'minimal' },
          revision: resume.revision,
        })
        .expect(200)
    ).body.resume as ResumeDto;

    const versions = (await agent.get(`/api/resumes/${resume.id}/versions`).expect(200)).body
      .versions;
    expect(versions).toHaveLength(1);

    const restored = (
      await agent.post(`/api/resumes/${resume.id}/versions/${versions[0].id}/restore`).expect(200)
    ).body.resume as ResumeDto;
    expect(restored.content.basics.headline).toBe(SAMPLE_RESUME_CONTENT.basics.headline);
    expect(restored.theme.template).toBe(resume.theme.template);
    expect(restored.title).toBe(resume.title);
    expect(restored.revision).toBe(saved.revision + 1);

    const after = (await agent.get(`/api/resumes/${resume.id}/versions`).expect(200)).body.versions;
    expect(after).toHaveLength(2);
    expect(after.map((v: { label: string }) => v.label)).toContain(
      'Before restoring “Before tailoring”',
    );
  });

  it('labels unnamed snapshots and 404s unknown versions', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent);
    const version = (await agent.post(`/api/resumes/${resume.id}/versions`).send({}).expect(201))
      .body.version;
    expect(version.label).toMatch(/^Snapshot \d{4}-\d{2}-\d{2}/);
    await agent
      .post(`/api/resumes/${resume.id}/versions/00000000-0000-4000-8000-000000000000/restore`)
      .expect(404);
  });
});

describe('publishing, PDF and JSON', () => {
  it('keeps at most one public resume per user', async () => {
    const { agent } = await signUp(ctx);
    const first = await createFilledResume(agent, 'First');
    const second = await createFilledResume(agent, 'Second');
    await agent.post(`/api/resumes/${first.id}/publish`).send({ isPublic: true }).expect(200);
    await agent.post(`/api/resumes/${second.id}/publish`).send({ isPublic: true }).expect(200);
    const list = (await agent.get('/api/resumes').expect(200)).body.resumes as ResumeDto[];
    expect(list.filter((r) => r.isPublic).map((r) => r.id)).toEqual([second.id]);
  });

  it('renders the resume HTML and returns a PDF download', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent, 'Frontend roles');
    const res = await agent.get(`/api/resumes/${resume.id}/pdf`).buffer(true).expect(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="alex-rivera-frontend-roles.pdf"',
    );
    expect(ctx.pdf.lastHtml).toContain('@page { size: 210mm 297mm');
    expect(ctx.pdf.lastHtml).toContain('Brightline Health');
  });

  it('exports JSON Resume and imports it back', async () => {
    const { agent } = await signUp(ctx);
    const resume = await createFilledResume(agent, 'Exported');
    const exported = await agent.get(`/api/resumes/${resume.id}/export`).expect(200);
    expect(exported.headers['content-disposition']).toContain('exported.resume.json');
    const json = JSON.parse(exported.text);
    expect(json.basics.name).toBe('Alex Rivera');

    const imported = await agent.post('/api/resumes/import').send({ data: json }).expect(201);
    expect(imported.body.warnings).toEqual([]);
    expect(imported.body.resume.title).toBe('Exported');
    expect(imported.body.resume.content.sections).toHaveLength(resume.content.sections.length);
  });

  it('explains why an import failed', async () => {
    const { agent } = await signUp(ctx);
    const res = await agent.post('/api/resumes/import').send({ data: 'hello' }).expect(400);
    expect(res.body.error).toMatchObject({
      code: 'invalid_import',
      message: 'The file is not a JSON Resume object.',
    });
  });
});
