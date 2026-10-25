import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

// Fake mic + autoplay so the 2-Track recorder can run its full count-in → record → export flow headlessly.
test.use({
  permissions: ['microphone'],
  acceptDownloads: true,
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
});

const MP3 = path.resolve('e2e/fixtures/beat100.mp3'); // 100 BPM, kick on the downbeat at 0.5 s, ~20.04 s long

function readWav(file: string) {
  const buf = fs.readFileSync(file);
  const sr = buf.readUInt32LE(24), ch = buf.readUInt16LE(22);
  const n = (buf.length - 44) / (ch * 2);
  let peak = 0;
  for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
  return { riff: buf.toString('ascii', 0, 4), wave: buf.toString('ascii', 8, 12), sr, ch, dur: n / sr, peak: peak / 32768 };
}
async function download(page: Page, click: () => Promise<void>, file: string) {
  const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
  await dl.saveAs(file);
  return dl.suggestedFilename();
}
const takeReady = (page: Page, timeout = 30000) => expect(page.getByTestId('take-info')).toHaveText(/^Take:/, { timeout });

test('2-Track recorder: sequencer, count-in take, MP3 beat detection, mix + MIDI export', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const out = (name: string) => info.outputPath(name);

  await page.goto('/studio');
  // Existing studio is intact and the recorder is mounted below it.
  await expect(page.getByRole('heading', { name: 'Musaix Pro' })).toBeVisible();
  const studio = page.getByTestId('two-track');
  await studio.scrollIntoViewIfNeeded();
  await expect(studio.getByRole('heading', { name: '2-Track Recorder' })).toBeVisible();

  // Sequencer: toggle a cell, play, stop.
  const cell = page.getByTestId('cell-kick-1');
  const pressed = await cell.getAttribute('aria-pressed');
  await cell.click();
  await expect(cell).toHaveAttribute('aria-pressed', pressed === 'true' ? 'false' : 'true');
  await page.getByTestId('play').click();
  await expect(page.getByTestId('play')).toHaveText(/Stop/);
  await page.waitForTimeout(800);
  await page.getByTestId('play').click();
  await expect(page.getByTestId('play')).toHaveText(/Play/);

  // Count-in record from stopped (fake mic) → loop take.
  await page.getByTestId('rec').click();
  await takeReady(page);
  const bpm = Number(await page.getByTestId('bpm').inputValue());
  await expect(page.getByTestId('take-info')).toContainText(`@ ${bpm} BPM`);
  if (await page.getByTestId('play').textContent().then(t => t?.includes('Stop'))) await page.getByTestId('play').click();

  await download(page, () => page.getByTestId('export').click(), out('mix-seq.wav'));
  const mix = readWav(out('mix-seq.wav'));
  expect(mix.riff + mix.wave).toBe('RIFFWAVE');
  expect(mix.peak).toBeGreaterThan(0.01);
  const takeName = await download(page, () => studio.getByRole('button', { name: 'Take', exact: true }).click(), out('take.wav'));
  expect(takeName).toMatch(/\.wav$/);
  expect(readWav(out('take.wav')).peak).toBeGreaterThan(0.001); // fake mic beep was captured

  // Preset + MIDI + Bridge JSON.
  await page.getByTestId('preset').selectOption({ index: 2 });
  expect((await download(page, () => page.getByTestId('midi').click(), out('beat.mid')))).toMatch(/\.mid$/);
  expect(fs.readFileSync(out('beat.mid')).toString('ascii', 0, 4)).toBe('MThd');
  await download(page, () => page.getByTestId('bridge').click(), out('bridge.json'));
  const bridge = JSON.parse(fs.readFileSync(out('bridge.json'), 'utf8'));
  expect(Array.isArray(bridge.notes) ? bridge.notes.length : Object.keys(bridge).length).toBeGreaterThan(0);

  // MP3 beat source with BPM + downbeat detection.
  await page.getByTestId('mode-audio').click();
  await page.getByTestId('beat-file').setInputFiles(MP3);
  await expect(page.getByTestId('beat-info')).toContainText('Detected', { timeout: 20000 });
  expect(Math.abs(Number(await page.getByTestId('bpm').inputValue()) - 100)).toBeLessThanOrEqual(1);
  expect(Math.abs(Number(await page.getByTestId('beat-offset').inputValue()) - 0.5)).toBeLessThanOrEqual(0.04);

  // Record a loop take over the MP3 (count-in synced to its downbeat), export 2 repeats beat-only.
  await studio.getByRole('button', { name: 'Clear take' }).click();
  await page.getByTestId('rec').click();
  await takeReady(page);
  if (await page.getByTestId('play').textContent().then(t => t?.includes('Stop'))) await page.getByTestId('play').click();
  const detBpm = Number(await page.getByTestId('bpm').inputValue());
  await page.getByTestId('repeats').selectOption('2');
  await download(page, () => page.getByTestId('export').click(), out('mix-mp3.wav'));
  const loopBars = Number((await page.getByTestId('take-info').textContent())!.match(/Take: (\d+) bar/)![1]);
  const w = readWav(out('mix-mp3.wav'));
  expect(w.dur).toBeCloseTo((2 * loopBars * 4 * 60) / detBpm, 1);

  // Full-song mode spans the song after the downbeat.
  await page.getByTestId('beat-loop').selectOption('full');
  await studio.getByRole('button', { name: 'Clear take' }).click();
  await page.getByTestId('repeats').selectOption('1');
  await download(page, () => page.getByTestId('export').click(), out('mix-full.wav'));
  const full = readWav(out('mix-full.wav'));
  expect(Math.round(full.dur / ((4 * 60) / detBpm))).toBeGreaterThanOrEqual(8);

  // Cloud library is feature-gated: unconfigured deployments say so; configured ones ask to sign in on Audio.
  const cloud = page.getByTestId('cloud');
  await expect(cloud.getByText(/isn.t configured|Sign in on Audio/)).toBeVisible();

  expect(errors).toEqual([]);
});
