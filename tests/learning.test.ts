import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLearningState,
  curriculumBands,
  activeBands,
  bandProgress,
  nextLearningExercise,
  recordLearningOutcome,
  synchronizeLearningState,
} from '../src/lib/learning.ts';
import { persons, tenses, type Exercise, type Outcome } from '../src/lib/practice.ts';
const random = () => 0.5;
function pool(size = 10): Exercise[] {
  return tenses.flatMap((tense) =>
    ([1, 2] as const).flatMap((band) =>
      Array.from({ length: size }, (_, i) => ({
        id: `${tense}:${band}:${i}`,
        verb: `verb-${i % 4}`,
        person: persons[i % 6]!,
        tense,
        band,
        difficulty: band,
        before: 'Prima ',
        after: ' dopo.',
        answers: ['forma'],
        explanation: 'Spiegazione.',
      })),
    ),
  );
}
function fill(
  state: ReturnType<typeof createLearningState>,
  rows: Exercise[],
  outcome: Outcome = 'correct',
) {
  for (const e of rows)
    state.results[e.id] = { outcome, tense: e.tense as (typeof tenses)[number] };
}

test('starts with exactly the proposed three bands and all their questions', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  assert.deepEqual(
    activeBands(state, exercises).map((b) => b.id),
    ['presente:1', 'presente:2', 'passato_prossimo:1'],
  );
  assert.equal(state.queue.length, 30);
  assert.equal(new Set(state.queue).size, 30);
});

test('unlock thresholds use exact coverage and accuracy without rounding', () => {
  const exercises = pool(100);
  const band = curriculumBands(exercises)[0]!;
  for (const [covered, correct, ready] of [
    [59, 59, false],
    [60, 60, true],
    [60, 59, false],
    [80, 68, true],
    [80, 67, false],
    [99, 70, false],
    [100, 70, true],
    [100, 69, false],
  ] as const) {
    const state = createLearningState(exercises, random);
    band.questions.slice(0, covered).forEach((e, i) => {
      state.results[e.id] = { outcome: i < correct ? 'correct' : 'error', tense: 'presente' };
    });
    assert.equal(bandProgress(band, state.results).ready, ready, `${covered}/${correct}`);
  }
});

test('repetition changes the latest result instead of manufacturing coverage', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  const e = exercises[0]!;
  for (let i = 0; i < 20; i++) recordLearningOutcome(state, e, 'correct', exercises, random);
  assert.equal(bandProgress(curriculumBands(exercises)[0]!, state.results).covered, 1);
  recordLearningOutcome(state, e, 'error', exercises, random);
  assert.equal(bandProgress(curriculumBands(exercises)[0]!, state.results).accuracy, 0);
  recordLearningOutcome(state, e, 'correct', exercises, random);
  assert.equal(bandProgress(curriculumBands(exercises)[0]!, state.results).accuracy, 1);
});

test('frontier unlocks the fourth band, and an unready outgoing band blocks the fifth', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  const bands = curriculumBands(exercises);
  fill(state, bands[2]!.questions.slice(0, 6));
  recordLearningOutcome(state, bands[2]!.questions[0]!, 'correct', exercises, random);
  assert.equal(state.curriculum.unlocked.length, 4);
  fill(state, bands[3]!.questions.slice(0, 6));
  recordLearningOutcome(state, bands[3]!.questions[0]!, 'correct', exercises, random);
  assert.equal(state.curriculum.unlocked.length, 4);
  fill(state, bands[0]!.questions.slice(0, 6));
  recordLearningOutcome(state, bands[0]!.questions[0]!, 'correct', exercises, random);
  assert.deepEqual(
    activeBands(state, exercises).map((b) => b.id),
    ['presente:2', 'passato_prossimo:1', 'passato_prossimo:2', 'imperfetto:1'],
  );
  assert.ok(!state.queue.some((id) => id.startsWith('presente:1:')));
  assert.equal(state.results[bands[0]!.questions[0]!.id]?.outcome, 'correct');
});

test('a typo-only learner cannot unlock; earned unlocks survive later mistakes and growth', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  for (const e of exercises.slice(0, 30))
    recordLearningOutcome(state, e, 'typo', exercises, random);
  assert.equal(state.curriculum.unlocked.length, 3);
  const bands = curriculumBands(exercises);
  state.results = {};
  fill(state, bands[2]!.questions.slice(0, 6));
  recordLearningOutcome(state, bands[2]!.questions[0]!, 'correct', exercises, random);
  for (const e of bands[2]!.questions) recordLearningOutcome(state, e, 'error', exercises, random);
  const expanded = pool(20);
  synchronizeLearningState(state, expanded, random);
  assert.equal(state.curriculum.unlocked.length, 4);
  assert.equal(new Set(state.queue).size, state.queue.length);
});

test('an inactive-band review counts toward its origin and never joins the active queue', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  state.curriculum.unlocked = curriculumBands(exercises)
    .slice(0, 5)
    .map((b) => b.id);
  synchronizeLearningState(state, exercises, random);
  const e = exercises[0]!;
  recordLearningOutcome(state, e, 'correct', exercises, random);
  assert.equal(state.results[e.id]?.outcome, 'correct');
  // A caller may explicitly review an old question, but must not expand the window.
  synchronizeLearningState(state, exercises, random);
  assert.ok(!state.queue.includes(e.id));
});

test('wrong answers leave breathing room, typos wait longer, repeated misses spread out', () => {
  const exercises = pool(40);
  const state = createLearningState(exercises, random);
  const e = nextLearningExercise(state, exercises, random);
  recordLearningOutcome(state, e, 'error', exercises, random);
  const gap = state.queue.indexOf(e.id);
  assert.ok(gap >= 8 && gap <= 14);
  recordLearningOutcome(state, e, 'error', exercises, random);
  assert.ok(state.queue.indexOf(e.id) > gap);
  const typo = createLearningState(exercises, random);
  recordLearningOutcome(typo, e, 'typo', exercises, random);
  assert.ok(typo.queue.indexOf(e.id) > gap);
  recordLearningOutcome(state, e, 'correct', exercises, random);
  assert.ok(state.queue.indexOf(e.id) >= state.queue.length * 0.75);
});

test('context scores still adapt without changing archived mastery or level', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  const e = exercises[0]!;
  recordLearningOutcome(state, e, 'error', exercises, random);
  assert.equal(state.contexts.questions[e.id]?.errors, 1);
  assert.equal(state.contexts.verbs[e.verb]?.errors, 1);
  assert.equal(state.contexts.persons[e.person]?.errors, 1);
  assert.equal(state.contexts.tenses.presente?.errors, 1);
  assert.equal(state.learner.totalMastery, 0);
  assert.equal(state.learner.level, 1);
});
