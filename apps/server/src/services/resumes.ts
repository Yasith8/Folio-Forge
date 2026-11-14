import {
  DEFAULT_THEME,
  createStarterContent,
  regenerateIds,
  type ResumeContent,
  type ResumeDto,
  type ResumeSummary,
  type ResumeTheme,
  type ResumeVersionDto,
  type UpdateResumeInput,
} from '@folioforge/shared';
import { and, desc, eq, ne, notInArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { resumeVersions, resumes, users, type ResumeRow } from '../db/schema';
import { conflict, notFound } from '../lib/errors';
import { sanitizeContent } from './sanitize';

/** Older snapshots beyond this are pruned so history cannot grow without bound. */
export const MAX_VERSIONS_PER_RESUME = 50;

export function toResumeDto(row: ResumeRow): ResumeDto {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    theme: row.theme,
    isPublic: row.isPublic,
    viewCount: row.viewCount,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const ownedBy = (userId: string, id: string) => and(eq(resumes.id, id), eq(resumes.userId, userId));

export async function listResumes(db: Db, userId: string): Promise<ResumeSummary[]> {
  const rows = await db
    .select({
      id: resumes.id,
      title: resumes.title,
      theme: resumes.theme,
      isPublic: resumes.isPublic,
      viewCount: resumes.viewCount,
      createdAt: resumes.createdAt,
      updatedAt: resumes.updatedAt,
    })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    template: r.theme.template,
    isPublic: r.isPublic,
    viewCount: r.viewCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getResumeRow(db: Db, userId: string, id: string): Promise<ResumeRow> {
  const [row] = await db.select().from(resumes).where(ownedBy(userId, id)).limit(1);
  // Other users' resumes return 404, not 403, so ids cannot be probed.
  if (!row) throw notFound('Resume not found.');
  return row;
}

export async function createResume(
  db: Db,
  userId: string,
  input: {
    title: string;
    content?: ResumeContent;
    theme?: ResumeTheme;
    starter?: { name: string; email: string };
  },
): Promise<ResumeDto> {
  const content = input.content ?? createStarterContent(input.starter?.name, input.starter?.email);
  const [row] = await db
    .insert(resumes)
    .values({
      userId,
      title: input.title,
      content: sanitizeContent(content),
      theme: input.theme ?? DEFAULT_THEME,
    })
    .returning();
  return toResumeDto(row!);
}

/**
 * Saves a resume using optimistic concurrency: the update only applies if the
 * client's revision matches the stored one. A mismatch means another tab or
 * device saved in between, so we answer 409 instead of silently overwriting.
 */
export async function updateResume(
  db: Db,
  userId: string,
  id: string,
  input: UpdateResumeInput,
): Promise<ResumeDto> {
  const [row] = await db
    .update(resumes)
    .set({
      title: input.title,
      content: sanitizeContent(input.content),
      theme: input.theme,
      revision: sql`${resumes.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(and(ownedBy(userId, id), eq(resumes.revision, input.revision)))
    .returning();
  if (row) return toResumeDto(row);
  await getResumeRow(db, userId, id); // Throws 404 if it does not exist.
  throw conflict(
    'This resume was changed in another tab or device. Reload to get the latest version.',
    'revision_conflict',
  );
}

export async function deleteResume(db: Db, userId: string, id: string): Promise<void> {
  const deleted = await db.delete(resumes).where(ownedBy(userId, id)).returning({ id: resumes.id });
  if (!deleted.length) throw notFound('Resume not found.');
}

export async function duplicateResume(db: Db, userId: string, id: string): Promise<ResumeDto> {
  const source = await getResumeRow(db, userId, id);
  const title = `${source.title} (copy)`.slice(0, 80);
  const [row] = await db
    .insert(resumes)
    .values({ userId, title, content: regenerateIds(source.content), theme: source.theme })
    .returning();
  return toResumeDto(row!);
}

/* ------------------------------------------------------------------ */
/* Version history                                                    */
/* ------------------------------------------------------------------ */

const toVersionDto = (row: { id: string; label: string; createdAt: Date }): ResumeVersionDto => ({
  id: row.id,
  label: row.label,
  createdAt: row.createdAt.toISOString(),
});

export async function listVersions(
  db: Db,
  userId: string,
  resumeId: string,
): Promise<ResumeVersionDto[]> {
  await getResumeRow(db, userId, resumeId);
  const rows = await db
    .select({
      id: resumeVersions.id,
      label: resumeVersions.label,
      createdAt: resumeVersions.createdAt,
    })
    .from(resumeVersions)
    .where(eq(resumeVersions.resumeId, resumeId))
    .orderBy(desc(resumeVersions.createdAt), desc(resumeVersions.id));
  return rows.map(toVersionDto);
}

async function insertVersion(db: Db, resume: ResumeRow, label: string) {
  const [row] = await db
    .insert(resumeVersions)
    .values({
      resumeId: resume.id,
      label,
      title: resume.title,
      content: resume.content,
      theme: resume.theme,
    })
    .returning({
      id: resumeVersions.id,
      label: resumeVersions.label,
      createdAt: resumeVersions.createdAt,
    });
  const keep = db
    .select({ id: resumeVersions.id })
    .from(resumeVersions)
    .where(eq(resumeVersions.resumeId, resume.id))
    .orderBy(desc(resumeVersions.createdAt), desc(resumeVersions.id))
    .limit(MAX_VERSIONS_PER_RESUME);
  await db
    .delete(resumeVersions)
    .where(and(eq(resumeVersions.resumeId, resume.id), notInArray(resumeVersions.id, keep)));
  return toVersionDto(row!);
}

function defaultLabel(): string {
  return `Snapshot ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export async function createVersion(
  db: Db,
  userId: string,
  resumeId: string,
  label?: string,
): Promise<ResumeVersionDto> {
  const resume = await getResumeRow(db, userId, resumeId);
  return insertVersion(db, resume, label?.trim() || defaultLabel());
}

/**
 * Restores a snapshot. Before overwriting, the current state is saved as a
 * new snapshot, so a restore can always be undone. Runs in one transaction.
 */
export async function restoreVersion(
  db: Db,
  userId: string,
  resumeId: string,
  versionId: string,
): Promise<ResumeDto> {
  return db.transaction(async (tx) => {
    const txDb = tx as unknown as Db;
    const resume = await getResumeRow(txDb, userId, resumeId);
    const [version] = await tx
      .select()
      .from(resumeVersions)
      .where(and(eq(resumeVersions.id, versionId), eq(resumeVersions.resumeId, resumeId)))
      .limit(1);
    if (!version) throw notFound('Version not found.');
    await insertVersion(txDb, resume, `Before restoring “${version.label}”`.slice(0, 120));
    const [row] = await tx
      .update(resumes)
      .set({
        title: version.title,
        content: version.content,
        theme: version.theme,
        revision: sql`${resumes.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(ownedBy(userId, resumeId))
      .returning();
    return toResumeDto(row!);
  });
}

/* ------------------------------------------------------------------ */
/* Publishing                                                         */
/* ------------------------------------------------------------------ */

/** Publishing a resume makes it the one shown at /u/:username; any other public resume becomes private. */
export async function setPublic(
  db: Db,
  userId: string,
  id: string,
  isPublic: boolean,
): Promise<ResumeDto> {
  return db.transaction(async (tx) => {
    await getResumeRow(tx as unknown as Db, userId, id);
    if (isPublic) {
      await tx
        .update(resumes)
        .set({ isPublic: false })
        .where(and(eq(resumes.userId, userId), eq(resumes.isPublic, true), ne(resumes.id, id)));
    }
    const [row] = await tx.update(resumes).set({ isPublic }).where(ownedBy(userId, id)).returning();
    return toResumeDto(row!);
  });
}

export async function findPublicPortfolio(db: Db, username: string) {
  const [row] = await db
    .select({
      resume: resumes,
      user: { id: users.id, username: users.username, displayName: users.displayName },
    })
    .from(resumes)
    .innerJoin(users, eq(users.id, resumes.userId))
    .where(and(eq(users.username, username.toLowerCase()), eq(resumes.isPublic, true)))
    .limit(1);
  return row ?? null;
}

/** Atomic increment, so concurrent visits are all counted. Returns the new count. */
export async function incrementViews(db: Db, resumeId: string): Promise<number> {
  const [row] = await db
    .update(resumes)
    .set({ viewCount: sql`${resumes.viewCount} + 1` })
    .where(eq(resumes.id, resumeId))
    .returning({ viewCount: resumes.viewCount });
  return row?.viewCount ?? 0;
}
