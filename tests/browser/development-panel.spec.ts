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
