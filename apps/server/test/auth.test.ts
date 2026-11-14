import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { createTestContext, signUp, type TestContext } from './helpers';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.database.close();
});

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword('s3cret-password', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
    expect(await verifyPassword('anything', 'garbage')).toBe(false);
  });

  it('uses a random salt for every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });
});

describe('auth API', () => {
  it('signs up, sets an httpOnly session cookie and returns the user', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/signup')
      .send({
        displayName: 'Jo Park',
        email: 'Jo@Example.com',
        username: 'jo-park',
        password: 'password-123',
      })
      .expect(201);
    expect(res.body.user).toMatchObject({
      email: 'jo@example.com',
      username: 'jo-park',
      displayName: 'Jo Park',
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^ff_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('reports which fields are already taken', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/signup')
      .send({
        displayName: 'Other',
        email: 'jo@example.com',
        username: 'jo-park',
        password: 'password-123',
      })
      .expect(409);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual([
      'email',
      'username',
    ]);
  });

  it('validates input with field-level messages', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/signup')
      .send({ displayName: '', email: 'nope', username: 'A B', password: 'short' })
      .expect(400);
    expect(res.body.error.code).toBe('validation_error');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['displayName', 'email', 'username', 'password']));
  });

  it('logs in, reads the current user and logs out', async () => {
    const { credentials } = await signUp(ctx);
    const agent = request.agent(ctx.app);
    await agent.get('/api/auth/me').expect(401);
    await agent
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);
    await agent
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe(credentials.email);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('gives the same error for unknown emails and wrong passwords', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-123' })
      .expect(401);
    expect(res.body.error.message).toBe('Email or password is incorrect.');
  });

  it('blocks state-changing requests from other origins', async () => {
    const { agent } = await signUp(ctx);
    await agent
      .post('/api/resumes')
      .set('Origin', 'https://evil.example')
      .send({ title: 'x' })
      .expect(403);
  });
});
