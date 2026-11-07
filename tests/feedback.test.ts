import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackRows, accuracyChange } from '../src/lib/feedback.ts';
import { exercises, verbs } from './content-fixture.ts';
import { createLearningState } from '../src/lib/learning.ts';
test('each question counts once in one person and one tense-specific regularity cell', () => {
  const state = createLearningState(exercises, () => 0.5);
  const e = exercises.find((e) => e.id === 'presente-0041')!; // leggere: regular present, irregular past
  state.results[e.id] = { outcome: 'correct', tense: 'presente' };
  const row = feedbackRows(state.results, exercises, verbs)[0]!;
  assert.equal(row.cells[0]?.correct, 1);
  assert.equal(row.cells[6]?.correct, 1);
  assert.equal(row.cells[7]?.covered, 0);
  assert.equal(
    row.cells.reduce((n, c) => n + c.covered, 0),
    2,
  );
  state.results[e.id] = { outcome: 'typo', tense: 'presente' };
  assert.equal(feedbackRows(state.results, exercises, verbs)[0]!.cells[0]!.correct, 0);
});
test('arrows compare exact accuracy, with no artificial zero baseline', () => {
  assert.equal(accuracyChange({ covered: 0, correct: 0 }, { covered: 1, correct: 1 }), 0);
  assert.equal(accuracyChange({ covered: 2, correct: 1 }, { covered: 3, correct: 2 }), 1);
  assert.equal(accuracyChange({ covered: 2, correct: 1 }, { covered: 3, correct: 1 }), -1);
  assert.equal(accuracyChange({ covered: 2, correct: 1 }, { covered: 4, correct: 2 }), 0);
});

test('remaining work includes intermediate and outgoing bands on the route to a new tense', async () => {
  const { nextUnlockEstimate, answersToQualify } = await import('../src/lib/feedback.ts');
  const { curriculumBands } = await import('../src/lib/learning.ts');
  const state = createLearningState(exercises, () => 0.5);
  const estimate = nextUnlockEstimate(state, exercises)!;
  assert.equal(estimate.target.id, 'imperfetto:1');
  assert.deepEqual([estimate.minimum, estimate.maximum], [270, 450]);
  const bands = curriculumBands(exercises);
  for (const e of bands[0]!.questions.slice(0, 90))
    state.results[e.id] = { outcome: 'correct', tense: 'presente' };
  assert.deepEqual(answersToQualify(bands[0]!, state.results), { minimum: 0, maximum: 0 });
  assert.deepEqual(
    [nextUnlockEstimate(state, exercises)!.minimum, nextUnlockEstimate(state, exercises)!.maximum],
    [180, 300],
  );
  state.curriculum.unlocked = bands.map((b) => b.id);
  assert.equal(nextUnlockEstimate(state, exercises), null);
});

test('remaining-work routes account for correcting old errors and already sufficient coverage', async () => {
  const { answersToQualify } = await import('../src/lib/feedback.ts');
  const { curriculumBands } = await import('../src/lib/learning.ts');
  const band = curriculumBands(exercises)[0]!;
  const state = createLearningState(exercises, () => 0.5);
  for (const e of band.questions) state.results[e.id] = { outcome: 'error', tense: 'presente' };
  assert.deepEqual(answersToQualify(band, state.results), { minimum: 105, maximum: 150 });
  for (const e of band.questions.slice(0, 104))
    state.results[e.id] = { outcome: 'correct', tense: 'presente' };
  assert.equal(answersToQualify(band, state.results).minimum, 1);
});
