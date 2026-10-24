import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface AnswerFixture {
  id: string;
  answers: string[];
}

const rawExercises: AnswerFixture[] = JSON.parse(
  readFileSync(new URL('../../src/content/exercises.json', import.meta.url), 'utf8'),
);
const rawPilotExercises: AnswerFixture[] = JSON.parse(
  readFileSync(new URL('../../src/content/exercises-pilot.json', import.meta.url), 'utf8'),
);

const answerByExercise = new Map(
  [...rawExercises, ...rawPilotExercises].map(
    (exercise) => [exercise.id, exercise.answers[0]!] as const,
  ),
);

async function begin(page: import('@playwright/test').Page, name = '') {
  await page.goto('/');
  if (await page.getByRole('button', { name: 'Cominciamo' }).count()) {
    if (name) await page.getByLabel('Piacere! Ops… come ti chiami?').fill(name);
    await page.getByRole('button', { name: 'Cominciamo' }).click();
  }
}

async function answerCurrent(page: import('@playwright/test').Page) {
  const exerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
  await page.getByRole('textbox').fill(answerByExercise.get(exerciseId!)!);
}

test('introduction explains keyboard use and accepts an optional name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sbagliando');
  await expect(page.getByText(/usa ↑ e ↓/)).toBeVisible();
  await page.getByLabel('Piacere! Ops… come ti chiami?').fill('Rico');
  await page.getByRole('button', { name: 'Cominciamo' }).click();
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await expect(page.getByRole('heading', { name: 'Esatto, Rico!' })).toBeVisible();
});

test('practice stays quiet and waits for deliberate continuation', async ({ page }) => {
  await begin(page);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.getByText('Presente indicativo', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/oppure premi/)).toHaveCount(0);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByRole('textbox')).not.toHaveValue('');
  await expect(page.locator('.exercise-form')).toHaveClass(/answer-correct/);
  await expect(page.locator('.history-dot.correct')).toHaveCount(1);
  await page.getByRole('button', { name: 'Prossima frase' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('');
});

test('table starts open, can be retired, and can be restored in settings', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Non lo so ancora' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Non mostrare più questa tabella' }).click();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Apri le impostazioni' }).click();
  const checkbox = page.getByRole('checkbox', { name: /Mostra la tabella/ });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('table')).toBeVisible();
});

test('settings edit the name, offer three themes, and reset progress', async ({ page }) => {
  await begin(page, 'Rico');
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Apri le impostazioni' }).click();
  const name = page.getByRole('textbox', { name: 'Il tuo nome' });
  await expect(name).toHaveValue('Rico');
  await page.getByRole('button', { name: 'Cancella' }).click();
  await expect(name).toHaveValue('');
  await page.getByRole('button', { name: 'Scuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Sistema' }).click();
  expect(await page.evaluate(() => localStorage.getItem('unpo-theme'))).toBeNull();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Azzera i miei progressi' }).click();
  const learning = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('unpo-learning-state')!),
  );
  expect(learning.learner).toMatchObject({ level: 1, totalMastery: 0, missedMastery: 0 });
  await expect(page.getByRole('textbox')).toHaveValue('');
});

test('main theme control cycles auto, light, dark, and back to auto', async ({ page }) => {
  await begin(page);
  const toggle = page.getByRole('button', { name: /Tema automatico/ });
  await expect(toggle.locator('.theme-icon-system')).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('button', { name: /Tema chiaro/ })).toBeVisible();
  await expect(page.locator('.theme-icon-light')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unpo-theme'))).toBe('light');
  await page.getByRole('button', { name: /Tema chiaro/ }).click();
  await expect(page.getByRole('button', { name: /Tema scuro/ })).toBeVisible();
  await expect(page.locator('.theme-icon-dark')).toBeVisible();
  await page.getByRole('button', { name: /Tema scuro/ }).click();
  await expect(page.getByRole('button', { name: /Tema automatico/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unpo-theme'))).toBeNull();
});

test('information contains motivation, privacy, and the author link', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Il resto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Il resto' });
  await expect(dialog.getByRole('heading', { name: 'Come funziona' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Perché esiste' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Privacy' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/ricardo-boni-9b15744/',
  );
  await expect(dialog.getByRole('button', { name: /Proviamo|Cominciamo/ })).toHaveCount(0);
});

test('privacy link in settings opens the privacy section', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Apri le impostazioni' }).click();
  await page.getByRole('button', { name: 'Come vengono usati i miei dati?' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeFocused();
});

test('wordmark preserves the session while Escape concludes it', async ({ page }) => {
  await begin(page);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Torna all’esercizio corrente' }).click();
  await expect(page.getByRole('textbox')).not.toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Esatto!' })).toBeVisible();
  await page.getByRole('button', { name: 'Apri le impostazioni' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Impostazioni' })).not.toBeVisible();
  await expect(page.getByRole('textbox')).not.toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Un po’ meglio');
});

test('arrow keys browse answered items and return to the live exercise', async ({ page }) => {
  await begin(page);
  await page.getByRole('textbox').fill('sbagliato');
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Prossima frase' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect(page.getByRole('textbox')).toBeEditable();

  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('textbox')).toHaveValue('sbagliato');
  await expect(page.getByRole('textbox')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Prossima frase' })).toBeDisabled();
  await expect(page.locator('.history-indicator')).toHaveClass(/visible/);
  await expect(page.locator('.history-dot.active.incorrect')).toHaveCount(1);
  await expect(page.locator('.exercise-form')).toHaveClass(/answer-incorrect/);
  await expect(page.locator('.answer-slot input')).toHaveCSS('border-bottom-style', 'solid');
  await expect(page.locator('.answer-slot input')).not.toHaveCSS(
    'border-bottom-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator('.infinitive')).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect(page.getByRole('textbox')).toBeEditable();
  await page.waitForTimeout(2800);
  await expect(page.locator('.history-indicator')).not.toHaveClass(/visible/);
});

test('history indicator caps itself at 20 items and reports omitted items', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await begin(page);
  for (let index = 0; index < 21; index++) {
    await page.getByRole('button', { name: 'Non lo so ancora' }).click();
    await page.getByRole('button', { name: 'Prossima frase' }).click();
  }
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.history-dot')).toHaveCount(20);
  await expect(page.locator('.history-overflow')).toContainText('+2');
});

test('session summary omits points, difficulty, saved-data copy, and restart control', async ({
  page,
}) => {
  await begin(page);
  const currentVerb = (await page.locator('.infinitive').textContent())!.trim();
  await page.getByRole('textbox').fill('sbagliato');
  await page.getByRole('button', { name: 'Verifica' }).click();
  await expect(page.getByRole('button', { name: 'Concludi la sessione' })).not.toContainText('↗');
  await page.getByRole('button', { name: /Concludi la sessione/ }).click();
  await expect(page.locator('.summary-stats')).toContainText('0%');
  await expect(page.locator('.summary-stats')).toContainText('livello');
  await expect(page.locator('body')).not.toContainText(
    /punti|Difficoltà media|risultati sono salvati/,
  );
  await expect(page.getByRole('button', { name: 'Ancora un po’' })).toHaveCount(0);
  const review = page.locator('.review-note');
  await expect(review).toContainText(currentVerb);
  expect((await review.boundingBox())!.width).toBeGreaterThan(300);
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await begin(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Non lo so ancora' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
