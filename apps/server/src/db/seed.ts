import { SAMPLE_RESUME_CONTENT, SAMPLE_RESUME_THEME } from '@folioforge/shared';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../auth/password';
import { createResume, createVersion, setPublic, updateResume } from '../services/resumes';
import type { Db } from './client';
import { users } from './schema';

export const DEMO_USER = {
  email: 'demo@folioforge.dev',
  username: 'demo',
  displayName: 'Alex Rivera',
  password: 'demo-password-123',
};

/** Creates the demo account with two filled-in resumes. Safe to run repeatedly. */
export async function seedDemo(db: Db): Promise<{ created: boolean }> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_USER.email))
    .limit(1);
  if (existing) return { created: false };

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_USER.email,
      username: DEMO_USER.username,
      displayName: DEMO_USER.displayName,
      passwordHash: await hashPassword(DEMO_USER.password),
    })
    .returning({ id: users.id });
  const userId = user!.id;

  const frontend = await createResume(db, userId, {
    title: 'Frontend roles',
    content: SAMPLE_RESUME_CONTENT,
    theme: SAMPLE_RESUME_THEME,
  });
  await createVersion(db, userId, frontend.id, 'First complete draft');
  await setPublic(db, userId, frontend.id, true);

  const fullStack = await createResume(db, userId, {
    title: 'Full-stack roles',
    content: SAMPLE_RESUME_CONTENT,
    theme: {
      ...SAMPLE_RESUME_THEME,
      template: 'classic',
      accentColor: '#1f4e79',
      pageSize: 'Letter',
    },
  });
  await updateResume(db, userId, fullStack.id, {
    title: fullStack.title,
    theme: fullStack.theme,
    revision: fullStack.revision,
    content: {
      ...fullStack.content,
      basics: {
        ...fullStack.content.basics,
        headline: 'Full-stack Engineer (React, Node.js, PostgreSQL)',
      },
    },
  });
  return { created: true };
}
