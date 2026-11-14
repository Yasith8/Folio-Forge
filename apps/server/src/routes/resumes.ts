import {
  createResumeInputSchema,
  createVersionInputSchema,
  fromJsonResume,
  importResumeInputSchema,
  JsonResumeImportError,
  publishInputSchema,
  toJsonResume,
  updateResumeInputSchema,
  type ImportResumeResponse,
} from '@folioforge/shared';
import { Router, type Request } from 'express';
import type { Db } from '../db/client';
import { HttpError, unauthorized } from '../lib/errors';
import { parseId, slugify } from '../lib/params';
import { renderResumeHtml } from '../render/resumeHtml';
import { PdfUnavailableError, type PdfRenderer } from '../services/pdf';
import * as service from '../services/resumes';
import { sanitizeContent } from '../services/sanitize';

function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function resumesRouter({ db, pdf }: { db: Db; pdf: PdfRenderer }): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ resumes: await service.listResumes(db, currentUser(req).id) });
  });

  router.post('/', async (req, res) => {
    const user = currentUser(req);
    const input = createResumeInputSchema.parse(req.body);
    const resume = await service.createResume(db, user.id, {
      title: input.title.trim(),
      starter: { name: user.displayName, email: user.email },
    });
    res.status(201).json({ resume });
  });

  router.post('/import', async (req, res) => {
    const user = currentUser(req);
    const input = importResumeInputSchema.parse(req.body);
    let imported;
    try {
      imported = fromJsonResume(input.data);
    } catch (error) {
      if (error instanceof JsonResumeImportError)
        throw new HttpError(400, 'invalid_import', error.message);
      throw error;
    }
    const resume = await service.createResume(db, user.id, {
      title: input.title?.trim() || imported.title,
      content: sanitizeContent(imported.content),
      theme: imported.theme,
    });
    const body: ImportResumeResponse = { resume, warnings: imported.warnings };
    res.status(201).json(body);
  });

  router.get('/:id', async (req, res) => {
    const row = await service.getResumeRow(db, currentUser(req).id, parseId(req.params.id));
    res.json({ resume: service.toResumeDto(row) });
  });

  router.put('/:id', async (req, res) => {
    const input = updateResumeInputSchema.parse(req.body);
    const resume = await service.updateResume(db, currentUser(req).id, parseId(req.params.id), {
      ...input,
      title: input.title.trim(),
    });
    res.json({ resume });
  });

  router.delete('/:id', async (req, res) => {
    await service.deleteResume(db, currentUser(req).id, parseId(req.params.id));
    res.status(204).end();
  });

  router.post('/:id/duplicate', async (req, res) => {
    const resume = await service.duplicateResume(db, currentUser(req).id, parseId(req.params.id));
    res.status(201).json({ resume });
  });

  router.post('/:id/publish', async (req, res) => {
    const { isPublic } = publishInputSchema.parse(req.body);
    const resume = await service.setPublic(
      db,
      currentUser(req).id,
      parseId(req.params.id),
      isPublic,
    );
    res.json({ resume });
  });

  router.get('/:id/versions', async (req, res) => {
    res.json({
      versions: await service.listVersions(db, currentUser(req).id, parseId(req.params.id)),
    });
  });

  router.post('/:id/versions', async (req, res) => {
    const { label } = createVersionInputSchema.parse(req.body ?? {});
    const version = await service.createVersion(
      db,
      currentUser(req).id,
      parseId(req.params.id),
      label,
    );
    res.status(201).json({ version });
  });

  router.post('/:id/versions/:versionId/restore', async (req, res) => {
    const resume = await service.restoreVersion(
      db,
      currentUser(req).id,
      parseId(req.params.id),
      parseId(req.params.versionId, 'Version'),
    );
    res.json({ resume });
  });

  router.get('/:id/export', async (req, res) => {
    const row = await service.getResumeRow(db, currentUser(req).id, parseId(req.params.id));
    const json = toJsonResume({ title: row.title, content: row.content, theme: row.theme });
    res
      .type('application/json')
      .set('Content-Disposition', `attachment; filename="${slugify(row.title)}.resume.json"`)
      .send(JSON.stringify(json, null, 2));
  });

  router.get('/:id/pdf', async (req, res) => {
    const row = await service.getResumeRow(db, currentUser(req).id, parseId(req.params.id));
    let buffer: Buffer;
    try {
      buffer = await pdf.render(renderResumeHtml(row));
    } catch (error) {
      if (error instanceof PdfUnavailableError) {
        console.error(error.cause);
        throw new HttpError(503, 'pdf_unavailable', error.message);
      }
      throw error;
    }
    const name = slugify([row.content.basics.name, row.title].filter(Boolean).join(' '));
    res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="${name}.pdf"`)
      .set('Cache-Control', 'no-store')
      .send(buffer);
  });

  return router;
}
