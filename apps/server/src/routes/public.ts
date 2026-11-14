import { Router } from 'express';
import type { Db } from '../db/client';
import { renderNotFoundHtml, renderPortfolioHtml } from '../render/portfolioHtml';
import { findPublicPortfolio, incrementViews } from '../services/resumes';

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|discord|slack|whatsapp|headless/i;

export function publicRouter({ db, publicUrl }: { db: Db; publicUrl: string }): Router {
  const router = Router();

  router.get('/:username', async (req, res) => {
    const username = String(req.params.username);
    const found = /^[a-z0-9-]{1,30}$/i.test(username)
      ? await findPublicPortfolio(db, username)
      : null;
    if (!found) {
      res.status(404).type('html').send(renderNotFoundHtml(username));
      return;
    }
    const { resume, user } = found;
    // Simple view counter: skip crawlers, link-preview bots and the owner's own visits.
    const isBot = BOT_PATTERN.test(req.get('user-agent') ?? '');
    const isOwner = req.user?.id === user.id;
    const viewCount = isBot || isOwner ? resume.viewCount : await incrementViews(db, resume.id);

    res
      .status(200)
      .type('html')
      .set('Cache-Control', 'no-cache')
      .send(
        renderPortfolioHtml({
          username: user.username,
          content: resume.content,
          theme: resume.theme,
          viewCount,
          publicUrl,
        }),
      );
  });

  return router;
}
