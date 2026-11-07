import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('sign up, build a resume, export a PDF and publish it', async ({ page }) => {
  const id = Date.now().toString(36);
  const username = `e2e-${id}`;

  // Sign up
  await page.goto('/signup');
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Morgan Lee');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`morgan-${id}@example.com`);
  await page.getByRole('textbox', { name: 'Username', exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your resumes' })).toBeVisible();

  // Create a resume
  await page.getByRole('button', { name: 'New resume' }).first().click();
  await page.getByRole('textbox', { name: 'Resume name', exact: true }).fill('Backend roles');
  await page.getByRole('button', { name: 'Create resume' }).click();
  await expect(page.getByRole('tab', { name: 'Content' })).toBeVisible();
  const preview = page.frameLocator('iframe[title="Resume preview"]');
  await expect(preview.getByRole('heading', { name: 'Morgan Lee' })).toBeVisible();

  // Personal info: the preview updates as you type
  await page.getByRole('textbox', { name: 'Headline', exact: true }).fill('Backend Engineer');
  await expect(preview.getByText('Backend Engineer')).toBeVisible();

  // Add an experience entry
  await page
    .getByRole('button', { name: /^Experience/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Add position' }).click();
  await page.getByRole('textbox', { name: 'Job title', exact: true }).fill('Platform Engineer');
  await page.getByRole('textbox', { name: 'Company', exact: true }).fill('Northwind Traders');
  await page.getByRole('textbox', { name: 'Start date', exact: true }).fill('2022-05');
  await page.getByRole('checkbox', { name: 'I currently work here' }).check();
  await expect(preview.getByText('Northwind Traders')).toBeVisible();
  await expect(preview.getByText('May 2022 – Present')).toBeVisible();

  // Inline validation shows a helpful message
  await page.getByRole('textbox', { name: 'Company website', exact: true }).fill('northwind');
  await page.getByRole('textbox', { name: 'Company website', exact: true }).blur();
  await expect(page.getByText('Enter a full link starting with https://')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Company website', exact: true })
    .fill('https://northwind.example.com');

  // Autosave
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

  // Export a PDF rendered by headless Chromium on the server
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('morgan-lee-backend-roles.pdf');
  const pdf = await readFile((await download.path())!);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(5_000);

  // Publish and visit the public portfolio page
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText(`Published at /u/${username}.`)).toBeVisible();

  const response = await page.goto(`/u/${username}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Morgan Lee' })).toBeVisible();
  await expect(page.getByText('Northwind Traders')).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Morgan Lee – Backend Engineer',
  );
});
