import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemo } from '../src/db/seed';
import { createFilledResume, createTestContext, signUp, type TestContext } from './helpers';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.database.close();
});

describe('public portfolio pages', () => {
  it('returns 404 until a resume is published', async () => {
    const { agent, user } = await signUp(ctx, { username: 'casey' });
    const resume = await createFilledResume(agent);
    const missing = await request(ctx.app).get('/u/casey').expect(404);
    expect(missing.text).toContain('noindex');

    await agent.post(`/api/resumes/${resume.id}/publish`).send({ isPublic: true }).expect(200);
    const page = await request(ctx.app).get(`/u/${user.username}`).expect(200);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.text).toContain(
      '<title>Alex Rivera – Frontend Engineer moving into full-stack</title>',
    );
    expect(page.text).toContain(
      '<meta property="og:title" content="Alex Rivera – Frontend Engineer moving into full-stack">',
    );
    expect(page.text).toContain('<meta property="og:url" content="http://localhost:3000/u/casey">');
    expect(page.text).toContain('<link rel="canonical" href="http://localhost:3000/u/casey">');
    expect(page.text).toContain('"@type":"Person"');
    expect(page.text).toContain('pf-card');

    await agent.post(`/api/resumes/${resume.id}/publish`).send({ isPublic: false }).expect(200);
    await request(ctx.app).get('/u/casey').expect(404);
  });

  it('counts views from visitors but not from bots or the owner', async () => {
    const { agent } = await signUp(ctx, { username: 'dana' });
    const resume = await createFilledResume(agent);
    await agent.post(`/api/resumes/${resume.id}/publish`).send({ isPublic: true }).expect(200);

    await request(ctx.app).get('/u/dana').set('User-Agent', 'Mozilla/5.0').expect(200);
    await request(ctx.app).get('/u/dana').set('User-Agent', 'Mozilla/5.0').expect(200);
    await request(ctx.app).get('/u/dana').set('User-Agent', 'Googlebot/2.1').expect(200);
    await agent.get('/u/dana').expect(200);

    const saved = await agent.get(`/api/resumes/${resume.id}`).expect(200);
    expect(saved.body.resume.viewCount).toBe(2);
  });

  it('escapes user content in meta tags', async () => {
    const { agent } = await signUp(ctx, { username: 'eve' });
    const resume = await createFilledResume(agent);
    const content = structuredClone(resume.content);
    content.basics.name = 'Eve "><script>alert(1)</script>';
    await agent
      .put(`/api/resumes/${resume.id}`)
      .send({ title: resume.title, content, theme: resume.theme, revision: resume.revision })
      .expect(200);
    await agent.post(`/api/resumes/${resume.id}/publish`).send({ isPublic: true }).expect(200);
    const page = await request(ctx.app).get('/u/eve').expect(200);
    expect(page.text).not.toContain('<script>alert(1)</script>');
    expect(page.text).toContain('Eve &quot;&gt;&lt;script&gt;');
  });

  it('serves the seeded demo portfolio', async () => {
    expect((await seedDemo(ctx.database.db)).created).toBe(true);
    expect((await seedDemo(ctx.database.db)).created).toBe(false);
    const page = await request(ctx.app).get('/u/demo').expect(200);
    expect(page.text).toContain('Alex Rivera');
  });
});
