import { expect, test } from '@playwright/test';

test('visualizer is public and shows the idle prompt and controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/visualizer');
  await expect(page).toHaveURL(/\/visualizer$/);
  await expect(page).toHaveTitle(/Visualizer/);
  await expect(page.getByRole('heading', { name: 'Visualizer' })).toBeAttached();
  await expect(page.getByText('Use mic / Drop a track')).toBeVisible();
  await page.mouse.move(240, 240);
  const controls = page.getByRole('region', { name: 'Visualizer controls' });
  await expect(controls.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(controls.getByRole('button', { name: 'Use microphone' })).toBeVisible();
  await expect(controls.getByRole('button', { name: 'Choose audio file' })).toBeVisible();
  await expect(controls.getByRole('slider', { name: 'Sensitivity' })).toBeVisible();
  await expect(controls.getByRole('slider', { name: 'Seek' })).toBeVisible();
  await expect(controls.getByRole('combobox', { name: 'Mode' })).toBeVisible();
  await expect(controls.getByRole('combobox', { name: 'Theme' })).toBeVisible();
  await expect(controls.getByRole('button', { name: 'Enter fullscreen' })).toBeVisible();
  await expect(controls.getByRole('slider', { name: 'Volume' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Audio player' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the front door links to the visualizer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Visualizer' })).toHaveAttribute('href', '/visualizer');
});
