import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const shots = '/opt/cursor/artifacts';
mkdirSync(shots, { recursive: true });

const identity = {
  id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Young Solo',
  disambiguation: 'Separate listing',
  kind: 'person',
  area: '',
  urls: [{ label: 'MusicBrainz', href: 'https://musicbrainz.org/artist/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
};

test('research page explains the no-analysis desk', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/research');
  await expect(page.getByRole('heading', { name: 'Research an artist.' })).toBeVisible();
  await expect(page.getByText('This page does not write an analysis.')).toBeVisible();
  await expect(page.getByText('Fixture report')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/research-desktop-desk-start.png`, fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Look up artist' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-mobile-desk-start.png`, fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel('Artist name or catalog link').fill('https://genius.com/artists/example');
  await page.getByRole('button', { name: 'Look up artist' }).click();
  await expect(page.locator('[data-state="invalid_input"]')).toContainText('Only public MusicBrainz, English Wikipedia, and Wikidata artist links are accepted.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('research desk collects a catalog record, notes, and passage counts', async ({ page }) => {
  await page.route('**/api/artist-research', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}') as { action?: string };
    if (body.action === 'inspect') {
      await route.fulfill({
        json: {
          ok: false,
          status: 'insufficient_sources',
          message: 'Catalog only.',
          identity,
          sources: [{
            id: identity.id,
            title: 'Young Solo on MusicBrainz',
            publisher: 'MusicBrainz',
            url: identity.urls[0].href,
            retrievedAt: '2026-11-07T18:00:00.000Z',
            kind: 'catalog_record',
            excerpt: 'Young Solo is a MusicBrainz person record.',
          }],
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        ok: false,
        status: 'disambiguation',
        query: 'young solo',
        truncated: false,
        message: 'More than one catalog record could fit. Exact names stay separate from looser mentions until you choose.',
        candidates: [
          { ...identity, blurb: 'Separate listing', match: 'exact' },
          { id: 'mb:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Wormsign', disambiguation: 'Greg Young solo electronic', kind: 'person', area: 'Los Angeles', blurb: 'Mentioned under another name.', match: 'mention', urls: [] },
        ],
      },
    });
  });
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto('/research');
  await page.getByLabel('Artist name or catalog link').fill('young solo');
  await page.getByRole('button', { name: 'Look up artist' }).click();
  await expect(page.getByRole('heading', { name: 'Which record did you mean?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Wormsign, Greg Young solo electronic' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose Wormsign, Greg Young solo electronic' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-desktop-disambiguation.png`, fullPage: false });
  await page.getByRole('button', { name: 'Choose Young Solo, Separate listing' }).click();
  await expect(page.getByText('Working brief. Not an AI analysis. No model was called and no audio was measured.')).toBeVisible();
  await expect(page.getByText('Fixture report')).toHaveCount(0);
  await page.getByLabel(/Paste at most/).fill('hold the lane\nhold the lane');
  await expect(page.getByText('2 times').first()).toBeVisible();
  await page.getByRole('textbox', { name: 'Note', exact: true }).fill('Ordinary objects do the work.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Ordinary objects do the work.')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download research brief' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('research-brief-young-solo.md');
  await page.getByText('Working brief. Not an AI analysis. No model was called and no audio was measured.').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-desktop-brief.png`, fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Download research brief' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-mobile-brief.png`, fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
