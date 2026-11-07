import { test, expect } from '@playwright/test';

test('development tools select a question and restore original progress', async ({ page }) => {
  await page.goto('/');
  const original = await page.evaluate(
    () => JSON.parse(localStorage.getItem('unpo-learning-state')!).learner,
  );
  await page.getByRole('button', { name: 'Sviluppo', exact: true }).click();
  await expect(page.getByText('Riepilogo del salvataggio', { exact: true })).toBeVisible();
  const select = page.getByLabel('Frase', { exact: true });
  const id = await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(id!);
  await page.getByRole('button', { name: 'Prova questo tempo / frase' }).click();
  await expect(page.locator('.exercise-form')).toHaveAttribute('data-exercise-id', id!);
  await page.getByRole('button', { name: 'Sviluppo', exact: true }).click();
  await page.getByRole('button', { name: 'Ripristina progressi originali' }).click();
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('unpo-learning-state')!).learner,
  );
  expect(restored).toEqual(original);
});

test('development panel docks without overlap and submits real correct, typo and wrong answers', async ({
  page,
}) => {
  const { exercises } = await import('../content-fixture.ts');
  const { createLearningState } = await import('../../src/lib/learning.ts');
  const question = exercises.find((e) => e.answers.includes('parliamo'))!;
  const state = createLearningState(exercises, () => 0.5);
  state.queue = [question.id, ...state.queue.filter((id) => id !== question.id)];
  await page.addInitScript(
    (saved) => localStorage.setItem('unpo-learning-state', JSON.stringify(saved)),
    state,
  );
  for (const [button, outcome] of [
    ['Corretta ✓', 'correct'],
    ['Refuso ≈', 'typo'],
    ['Sbagliata ×', 'error'],
  ] as const) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sviluppo', exact: true }).click();
    const app = (await page.locator('#app').boundingBox())!;
    const panel = (await page.locator('.dev-tools').boundingBox())!;
    if (page.viewportSize()!.width >= 1000)
      expect(app.x).toBeGreaterThanOrEqual(panel.x + panel.width - 1);
    else expect(app.y).toBeGreaterThanOrEqual(panel.y + panel.height - 1);
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(page.locator('.exercise-form')).toHaveClass(
      outcome === 'correct' ? /answer-correct/ : /answer-incorrect/,
    );
    if (outcome === 'typo')
      await expect(page.getByRole('heading', { name: 'Quasi! Solo un refuso.' })).toBeVisible();
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('unpo-learning-state')!).results,
    );
    expect(saved[question.id].outcome).toBe(outcome);
    await expect(page.getByRole('button', { name: button, exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('development tools replay the summary without changing saved results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Non lo so ancora' }).click();
  await page.getByRole('button', { name: 'Concludi la sessione' }).click();
  const saved = await page.evaluate(() => localStorage.getItem('unpo-learning-state'));
  const original = await page.locator('.learning-feedback').elementHandle();
  await page.getByRole('button', { name: 'Sviluppo', exact: true }).click();
  await page.getByRole('button', { name: 'Ripeti animazione del riepilogo' }).click();
  await expect.poll(() => original!.evaluate((element) => element.isConnected)).toBe(false);
  await expect(page.locator('.learning-feedback')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unpo-learning-state'))).toBe(saved);
  const value = page.locator('.accuracy-value').first();
  const row = await value.evaluate(
    (element) => (element.closest('tr') as HTMLTableRowElement).sectionRowIndex,
  );
  await expect(value).toHaveCSS('animation-delay', `${(440 + row * 440) / 1000}s`);
});
