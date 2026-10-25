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
  if (name) {
    await page.getByRole('button', { name: 'Apri le impostazioni' }).click();
    await page.getByRole('textbox', { name: 'Il tuo nome' }).fill(name);
    await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
  }
}

async function answerCurrent(page: import('@playwright/test').Page) {
  await expect(page.locator('#verb-answer')).toBeEditable();
  const exerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
  await page.locator('#verb-answer').fill(answerByExercise.get(exerciseId!)!);
}

test('session analytics start on the first submitted answer rather than page load', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://cloud.umami.is/script.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.practiceEvents = []; window.umami = { track: (name) => window.practiceEvents.push(name) };',
    }),
  );
  const events = () =>
    page.evaluate(() => (window as unknown as { practiceEvents: string[] }).practiceEvents);
  await begin(page);
  expect(await events()).toEqual([]);
  await page.getByRole('button', { name: 'Concludi la sessione' }).click();
  expect(await events()).toEqual([]);
  await page.getByRole('button', { name: 'Torna all’esercizio corrente' }).click();
  await page.getByRole('button', { name: 'Non lo so ancora' }).click();
  expect(await events()).toEqual(['session_started', 'answer_incorrect']);
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Concludi la sessione' }).click();
  expect(await events()).toEqual([
    'session_started',
    'answer_incorrect',
    'answer_correct',
    'session_completed',
  ]);
});

test('editing the optional name pauses both clocks and Enter only saves the name', async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() =>
    localStorage.setItem(
      'unpo-profile-v1',
      JSON.stringify({ introduced: true, name: '', onboardingProgress: 4 }),
    ),
  );
  await begin(page);
  await page.clock.runFor(4600);
  const exerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  const next = page.getByRole('button', { name: 'Prossima frase', exact: true });
  await expect(next).toHaveClass(/auto-advance/);
  await page.getByLabel('Come ti chiami? Solo se ti va.').fill('Rico');
  await expect(next).not.toHaveClass(/auto-advance/);
  await page.clock.fastForward(60000);
  await expect(page.getByLabel('Come ti chiami? Solo se ti va.')).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.locator('.practice-context')).toContainText('Piacere, Rico.');
  await expect(page.locator('.exercise-form')).toHaveAttribute('data-exercise-id', exerciseId!);
  await expect(page.getByRole('heading', { name: 'Esatto, Rico!' })).toBeVisible();
});

test('first-use messages follow the clock while the sentence and controls stay in place', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await begin(page);
  const context = page.locator('.practice-context');
  const exerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
  const initialButton = (await page
    .getByRole('button', { name: 'Verifica', exact: true })
    .boundingBox())!.y;
  await expect(context).toHaveAttribute('data-message', 'empty');
  await expect(page.locator('#verb-answer')).toBeEditable();
  await page.clock.runFor(3000);
  await expect(context).toHaveAttribute('data-message', 'empty');
  await page.clock.runFor(1600);
  await expect(context).toContainText('Sbagliando, una frase alla volta.');
  await expect(context).toHaveAttribute('data-phase', 'visible');
  await page.clock.fastForward(20000);
  await page.clock.runFor(400);
  await expect(context).toHaveAttribute('data-message', 'empty');
  await page.clock.fastForward(38000);
  await expect(context).toHaveAttribute('data-message', 'empty');
  await page.clock.runFor(2800);
  await expect(context).toHaveAttribute('data-message', 'keyboard');
  await expect(context).toHaveAttribute('data-phase', 'visible');
  await expect(context).toContainText('Invio');
  await page.clock.fastForward(20000);
  await page.clock.runFor(400);
  await expect(context).toHaveAttribute('data-message', 'empty');
  await page.clock.fastForward(40000);
  await page.clock.runFor(500);
  const name = page.getByLabel('Come ti chiami? Solo se ti va.');
  await expect(name).toBeVisible();
  await expect(name).not.toBeFocused();
  await expect(page.locator('.exercise-form')).toHaveAttribute('data-exercise-id', exerciseId!);
  expect(
    (await page.getByRole('button', { name: 'Verifica', exact: true }).boundingBox())!.y,
  ).toEqual(initialButton);
  // Ignoring the optional field never prevents an answer or the next exercise.
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await expect(page.locator('#verb-answer')).toBeEditable();
  await expect(name).toBeVisible();
});

test('only fully displayed onboarding messages are remembered across visits', async ({ page }) => {
  await page.clock.install();
  await begin(page);
  await page.clock.runFor(4600);
  await page.clock.fastForward(20000);
  await page.clock.runFor(400);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('unpo-profile-v1')!));
  expect(profile.seenMessages).toEqual(['introduction']);
  await page.reload();
  await expect(page.locator('.practice-context')).toHaveAttribute('data-message', 'empty');
  await page.clock.runFor(4600);
  await expect(page.locator('.practice-context')).toHaveAttribute('data-message', 'keyboard');
});

test('returning learners get a greeting and then their level without advancing questions', async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() =>
    localStorage.setItem('unpo-profile-v1', JSON.stringify({ introduced: true, name: 'Rico' })),
  );
  await begin(page);
  await expect(page.locator('.practice-context')).toHaveAttribute('data-message', 'empty');
  await page.clock.runFor(4600);
  await expect(page.locator('.practice-context')).toContainText('Che bello rivederti, Rico.');
  await expect(page.locator('#verb-answer')).toBeEditable();
  await expect(page.locator('.site-header')).not.toContainText(/livello/i);
  await page.clock.fastForward(20000);
  await page.clock.runFor(400);
  await page.clock.fastForward(40000);
  await page.clock.runFor(500);
  await expect(page.locator('.practice-context')).toContainText('Livello 1');
  await expect(page.locator('.practice-context')).toContainText('Grado I');
});

test('history is blank and the content clock pauses for history, dialogs, hidden tabs, and summaries', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await begin(page);
  await page.clock.runFor(4600);
  const context = page.locator('.practice-context');
  const height = (await context.boundingBox())!.height;
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await expect(page.locator('#verb-answer')).toBeEditable();
  await page.keyboard.press('ArrowUp');
  await expect(context).toHaveAttribute('data-message', 'empty');
  await expect(context.locator('.context-copy')).toBeHidden();
  expect((await context.boundingBox())!.height).toEqual(height);
  await page.clock.fastForward(60000);
  await page.keyboard.press('ArrowDown');
  await expect(context).toHaveAttribute('data-message', 'introduction');
  await page.getByRole('button', { name: 'Il resto' }).click();
  await page.clock.fastForward(60000);
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
  await expect(context).toHaveAttribute('data-phase', 'visible');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(60000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(context).toHaveAttribute('data-phase', 'visible');
  await page.getByRole('button', { name: 'Concludi la sessione' }).click();
  await page.clock.fastForward(60000);
  await page.locator('.summary-history .history-dot').first().click();
  await expect(context).toHaveAttribute('data-message', 'empty');
  await expect(context.locator('.context-copy')).toBeHidden();
  await page.getByRole('button', { name: 'Torna all’esercizio corrente' }).click();
  await expect(context).toHaveAttribute('data-message', 'introduction');
});

test('validation paints a temporary wash while the sentence stays still for either outcome', async ({
  page,
}) => {
  await begin(page);
  const sentence = page.locator('.sentence-content');
  const before = await sentence.boundingBox();
  await page.locator('#verb-answer').fill('sbagliato');
  await page.getByRole('button', { name: 'Verifica' }).click();
  await expect(sentence).toHaveCSS('animation-name', 'none');
  expect(await sentence.boundingBox()).toEqual(before);
  await expect(page.locator('.answer-wash')).toBeAttached();
  await expect(page.getByRole('region', { name: 'Risultato' })).toBeVisible();
  await page.waitForTimeout(650);
  await expect(page.locator('.answer-wash')).toHaveCSS('opacity', '0');
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Risultato' })).toBeHidden();
  await answerCurrent(page);
  const nextPosition = await sentence.boundingBox();
  await page.getByRole('button', { name: 'Verifica' }).click();
  expect(await sentence.boundingBox()).toEqual(nextPosition);
  await expect(page.locator('.answer-wash')).toBeAttached();
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await expect(page.locator('#verb-answer')).toBeEditable();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.answer-wash')).toHaveCount(0);
});

test('practice feedback remains available for manual continuation', async ({ page }) => {
  await begin(page);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.getByText('Presente indicativo', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/oppure premi/)).toHaveCount(0);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('#verb-answer')).not.toHaveValue('');
  await expect(page.locator('.exercise-form')).toHaveClass(/answer-correct/);
  await expect(page.locator('.history-dot.correct')).toHaveCount(1);
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await expect(page.locator('#verb-answer')).toHaveValue('');
});

test('next auto-advances after an animated interval and can be cancelled', async ({ page }) => {
  await begin(page);
  await page.clock.install();
  const firstExerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  const next = page.getByRole('button', { name: 'Prossima frase', exact: true });
  await expect(next).toBeEnabled();
  await expect(next).toHaveClass(/auto-advance/);
  expect(
    await next.evaluate((button) => getComputedStyle(button, '::before').animationDuration),
  ).toBe('4s');
  await expect(page.getByRole('button', { name: /Ferma il passaggio automatico/ })).toBeVisible();

  await page.clock.fastForward(4100);
  await expect(page.locator('.exercise-form')).not.toHaveAttribute(
    'data-exercise-id',
    firstExerciseId!,
  );

  const secondExerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
  await page.getByRole('button', { name: 'Non lo so ancora' }).click();
  expect(
    await next.evaluate((button) => getComputedStyle(button, '::before').animationDuration),
  ).toBe('10s');
  await page.getByRole('button', { name: /Ferma il passaggio automatico/ }).click();
  await expect(next).not.toHaveClass(/auto-advance/);
  await page.clock.fastForward(11000);
  await expect(page.locator('.exercise-form')).toHaveAttribute(
    'data-exercise-id',
    secondExerciseId!,
  );
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
  await expect(page.locator('#verb-answer')).toHaveValue('');
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
  await expect(page.locator('#verb-answer')).not.toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Esatto!' })).toBeVisible();
  await page.getByRole('button', { name: 'Apri le impostazioni' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Impostazioni' })).not.toBeVisible();
  await expect(page.locator('#verb-answer')).not.toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Un po’ meglio');
});

test('arrow keys browse answered items and return to the live exercise', async ({ page }) => {
  await begin(page);
  await page.locator('#verb-answer').fill('sbagliato');
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
  await expect(page.locator('#verb-answer')).toHaveValue('');
  await expect(page.locator('#verb-answer')).toBeEditable();

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#verb-answer')).toHaveValue('sbagliato');
  await expect(page.locator('#verb-answer')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Prossima frase', exact: true })).toBeDisabled();
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
  await expect(page.locator('#verb-answer')).toHaveValue('');
  await expect(page.locator('#verb-answer')).toBeEditable();
  await page.waitForTimeout(2800);
  await expect(page.locator('.history-indicator')).not.toHaveClass(/visible/);
});

test('history indicator caps itself at 20 items and reports omitted items', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await begin(page);
  for (let index = 0; index < 21; index++) {
    const currentExerciseId = await page.locator('.exercise-form').getAttribute('data-exercise-id');
    await answerCurrent(page);
    await page.getByRole('button', { name: 'Verifica' }).click();
    await page.getByRole('button', { name: 'Prossima frase', exact: true }).click();
    await expect(page.locator('.exercise-form')).not.toHaveAttribute(
      'data-exercise-id',
      currentExerciseId!,
    );
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
  await page.locator('#verb-answer').fill('sbagliato');
  await page.getByRole('button', { name: 'Verifica' }).click();
  await expect(page.getByRole('button', { name: 'Concludi la sessione' })).not.toContainText('↗');
  await page.getByRole('button', { name: /Concludi la sessione/ }).click();
  await expect(page.locator('.summary-stats')).toContainText('0%');
  await expect(page.locator('.summary-stats > div')).toHaveCount(2);
  await expect(
    page.getByRole('heading', { name: 'Oggi hai consolidato il percorso.' }),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /livello 1/ })).toBeVisible();
  await expect(page.locator('.progress-journey')).not.toHaveClass(/moving/);
  await expect(page.locator('.progress-strip')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('body')).not.toContainText(
    /punti|Difficoltà media|risultati sono salvati|prossimo grado/,
  );
  await expect(page.getByRole('button', { name: 'Ancora un po’' })).toHaveCount(0);
  const review = page.locator('.review-note');
  await expect(review).toContainText(currentVerb);
  expect((await review.boundingBox())!.width).toBeGreaterThan(300);
});

test('session summary shows progress as a level journey', async ({ page }) => {
  await begin(page);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Concludi la sessione' }).click();

  await expect(page.getByRole('heading', { name: 'Un po’ più avanti.' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Progresso della sessione/ })).toBeVisible();
  await expect(page.locator('.progress-strip')).toHaveClass(/animated/);
  await expect(page.locator('.progress-strip')).toHaveCSS('transition-delay', '0.9s');
  await expect(page.locator('.journey-reveal')).toHaveCSS('animation-duration', '1.7s');
  await expect(page.locator('.current-progress-marker')).toHaveCSS(
    'animation-name',
    /dot-from-line/,
  );
  await expect(page.locator('.level-mark.major')).toHaveCount(5);
  const journeyGeometry = await page.locator('.progress-window').evaluate((window) => {
    const line = window.querySelector<HTMLElement>('.journey-line')!;
    const styles = getComputedStyle(window);
    return {
      progress: Number.parseFloat(styles.getPropertyValue('--journey-width')),
      line: Number.parseFloat(getComputedStyle(line).width),
      halo: getComputedStyle(
        window.querySelector<HTMLElement>('.current-progress-marker')!,
        '::after',
      ).animationName,
    };
  });
  expect(journeyGeometry.line).toBeCloseTo(Math.max(0, journeyGeometry.progress - 12), 1);
  expect(journeyGeometry.halo).toContain('arrival-halo');
  await expect(page.locator('.session-start-marker')).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('.summary-stats > div')).toHaveCount(2);
  await expect(page.locator('.summary-stats')).toHaveCSS('animation-duration', '1.7s');
  const summaryOrder = await page.locator('.summary').evaluate((summary) => ({
    journey: summary.querySelector('.progress-journey')!.getBoundingClientRect().top,
    stats: summary.querySelector('.summary-stats')!.getBoundingClientRect().top,
  }));
  expect(summaryOrder.journey).toBeLessThan(summaryOrder.stats);

  await page.locator('.summary-history .history-dot.correct').click();
  await page.getByRole('button', { name: 'Torna al riepilogo della sessione' }).click();
  await expect(page.locator('.progress-journey')).toHaveClass(/revisit/);
  await expect(page.locator('.progress-journey')).toHaveClass(/celebrating/);
  await expect(page.locator('.progress-strip')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.progress-line')).toHaveCSS('opacity', '1');
  await expect(page.locator('.current-progress-marker')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.journey-reveal')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.summary-stats.revisit')).toHaveCount(1);
  const revisitHalo = await page
    .locator('.current-progress-marker')
    .evaluate((marker) => getComputedStyle(marker, '::after').animationName);
  expect(revisitHalo).toContain('arrival-halo');
});

test('summary history can revisit answers and return to the results', async ({ page }) => {
  await begin(page);
  await page.locator('#verb-answer').fill('sbagliato');
  await page.getByRole('button', { name: 'Verifica' }).click();
  await page.getByRole('button', { name: 'Concludi la sessione' }).click();

  const summaryHistory = page.locator('.summary-history');
  await expect(summaryHistory.locator('.history-dot.incorrect')).toHaveCount(1);
  await expect(summaryHistory.locator('.history-endpoint.active')).toHaveCount(1);

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#verb-answer')).toHaveValue('sbagliato');
  await expect(page.locator('#verb-answer')).toHaveAttribute('readonly', '');
  await expect(
    page.getByRole('button', { name: 'Torna al riepilogo della sessione' }),
  ).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.summary-history')).toBeVisible();
  await summaryHistory.locator('.history-dot.incorrect').click();
  await expect(page.locator('#verb-answer')).toHaveValue('sbagliato');
  await page.getByRole('button', { name: 'Torna al riepilogo della sessione' }).click();
  await expect(page.locator('.summary-history')).toBeVisible();
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await begin(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Non lo so ancora' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('wrapped sentences leave room between the verb hint and next button', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await begin(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('unpo-learning-state')!);
    state.queue = ['presente-29', ...state.queue.filter((id: string) => id !== 'presente-29')];
    localStorage.setItem('unpo-learning-state', JSON.stringify(state));
  });
  await page.reload();
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Verifica' }).click();

  const hint = (await page.locator('.infinitive').boundingBox())!;
  const button = (await page
    .getByRole('button', { name: 'Prossima frase', exact: true })
    .boundingBox())!;
  expect(button.y - (hint.y + hint.height)).toBeGreaterThanOrEqual(12);
});
