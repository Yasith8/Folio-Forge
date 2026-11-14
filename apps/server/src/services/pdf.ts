import type { Browser } from 'playwright';

export interface PdfRenderer {
  render(html: string): Promise<Buffer>;
  close(): Promise<void>;
}

export class PdfUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      'PDF export is unavailable because Chromium could not start. Run "npx playwright install chromium" or use the Docker setup.',
    );
    this.name = 'PdfUnavailableError';
    this.cause = cause;
  }
}

/**
 * Renders HTML to PDF with headless Chromium.
 *
 * - One browser process is reused; each export gets a fresh, isolated context.
 * - JavaScript is disabled and every network request is blocked: the HTML is
 *   self-contained, and user content must never make the server fetch URLs
 *   (that would be a server-side request forgery hole).
 * - At most `concurrency` pages render at once; extra requests wait in line.
 */
export class PlaywrightPdfRenderer implements PdfRenderer {
  private browser?: Promise<Browser>;
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly options: {
      executablePath?: string;
      concurrency?: number;
      timeoutMs?: number;
    } = {},
  ) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = import('playwright')
        .then(({ chromium }) =>
          chromium.launch({
            headless: true,
            executablePath: this.options.executablePath || undefined,
          }),
        )
        .then((browser) => {
          browser.on('disconnected', () => {
            this.browser = undefined;
          });
          return browser;
        })
        .catch((error: unknown) => {
          this.browser = undefined;
          throw new PdfUnavailableError(error);
        });
    }
    return this.browser;
  }

  private async acquire(): Promise<void> {
    if (this.active < (this.options.concurrency ?? 2)) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    this.waiting.shift()?.();
  }

  async render(html: string): Promise<Buffer> {
    await this.acquire();
    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        await context.route('**/*', (route) => route.abort());
        const page = await context.newPage();
        page.setDefaultTimeout(this.options.timeoutMs ?? 20_000);
        await page.setContent(html, { waitUntil: 'load' });
        await page.emulateMedia({ media: 'print' });
        const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
        return Buffer.from(pdf);
      } finally {
        await context.close();
      }
    } finally {
      this.release();
    }
  }

  async close(): Promise<void> {
    const browser = await this.browser?.catch(() => undefined);
    this.browser = undefined;
    await browser?.close();
  }
}
