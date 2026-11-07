import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { buildFixtureReport } from '../src/lib/artist-research/__tests__/fixture-report';

const shots = '/opt/cursor/artifacts';
mkdirSync(shots, { recursive: true });

test('research page stays honest without a model provider', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/research');
  await expect(page.getByRole('heading', { name: 'Look up an artist. Do not invent the craft.' })).toBeVisible();
  await expect(page.getByText('Craft synthesis is off. No model provider is selected, and no model call is made.')).toBeVisible();
  await expect(page.getByText('Fixture report')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/research-desktop-synthesis-off.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Look up artist' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-mobile-synthesis-off.png`, fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel('Artist name or catalog link').fill('https://genius.com/artists/example');
  await page.getByRole('button', { name: 'Look up artist' }).click();
  await expect(page.locator('[data-state="invalid_input"]')).toContainText('Only public MusicBrainz, English Wikipedia, and Wikidata artist links are accepted.');
  await page.screenshot({ path: `${shots}/research-desktop-rejected-link.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('research page can show disambiguation and a labeled fixture report', async ({ page }) => {
  const report = buildFixtureReport();
  await page.route('**/api/artist-research', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}') as { action?: string };
    if (body.action === 'inspect') {
      await route.fulfill({ json: { ok: true, status: 'report', report } });
      return;
    }
    await route.fulfill({
      json: {
        ok: false,
        status: 'disambiguation',
        query: 'young solo',
        truncated: false,
        message: 'More than one catalog record could fit that name. Similar names stay separate until you choose one.',
        candidates: [
          { id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Young Solo', disambiguation: 'Separate listing', kind: 'person', area: '', blurb: 'Separate listing', urls: [] },
          { id: 'mb:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Young Dolph', disambiguation: 'Memphis rapper', kind: 'person', area: 'Memphis', blurb: 'Memphis rapper', urls: [] },
        ],
      },
    });
  });
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto('/research');
  await page.getByLabel('Artist name or catalog link').fill('young solo');
  await page.getByRole('button', { name: 'Look up artist' }).click();
  await expect(page.getByRole('heading', { name: 'Which artist did you mean?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use Young Dolph, Memphis rapper' })).toBeVisible();
  await page.getByRole('button', { name: 'Use Young Dolph, Memphis rapper' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-desktop-disambiguation-fixture.png`, fullPage: false });
  await page.getByRole('button', { name: 'Use Young Solo, Separate listing' }).click();
  await expect(page.getByText('Fixture report. This was not produced by a live lookup.')).toBeVisible();
  await expect(page.getByText('End rhyme', { exact: true })).toBeVisible();
  await expect(page.getByText('Setup', { exact: true })).toBeVisible();
  await page.getByText('Fixture report. This was not produced by a live lookup.').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-desktop-report-fixture.png`, fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText('Fixture report. This was not produced by a live lookup.').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/research-mobile-report-fixture.png`, fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('research page shows insufficient catalog evidence without a report', async ({ page }) => {
  await page.route('**/api/artist-research', async (route) => {
    await route.fulfill({
      json: {
        ok: false,
        status: 'insufficient_sources',
        message: 'These catalog records identify a public artist page. They do not document lyric vocabulary, rhyme, punchlines, hooks, or delivery, so no craft report was generated and no model was called.',
        identity: { id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Young Solo', disambiguation: 'Separate listing', kind: 'person', area: '', urls: [{ label: 'MusicBrainz', href: 'https://musicbrainz.org/artist/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] },
        sources: [{
          id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          title: 'Young Solo on MusicBrainz',
          publisher: 'MusicBrainz',
          url: 'https://musicbrainz.org/artist/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          retrievedAt: '2026-11-07T18:00:00.000Z',
          kind: 'catalog_record',
          excerpt: 'Fixture catalog text used only to show the insufficient-source state.',
        }],
        synthesis: { catalog: { note: 'Public catalog only.' }, synthesis: { enabled: false, summary: 'Craft synthesis is off.', alternatives: [] }, privateArchives: { note: 'No private archive.' } },
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/research');
  await page.getByLabel('Artist name or catalog link').fill('Young Solo');
  await page.getByRole('button', { name: 'Look up artist' }).click();
  await expect(page.getByText('Craft report not generated. No model was called.')).toBeVisible();
  await page.screenshot({ path: `${shots}/research-mobile-insufficient-fixture.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
