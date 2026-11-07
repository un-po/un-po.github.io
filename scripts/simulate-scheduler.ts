import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadContent } from '../src/lib/content.ts';
import { tenses, type Exercise, type Outcome } from '../src/lib/practice.ts';
import {
  createLearningState,
  curriculumBands,
  activeBands,
  bandProgress,
  nextLearningExercise,
  recordLearningOutcome,
  synchronizeLearningState,
  type LearningState,
} from '../src/lib/learning.ts';
const { exercises } = loadContent(
  JSON.parse(readFileSync(new URL('../src/content/verbs.json', import.meta.url), 'utf8')),
  tenses.map((tense) =>
    JSON.parse(
      readFileSync(new URL(`../src/content/sentences/${tense}.json`, import.meta.url), 'utf8'),
    ),
  ),
);
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let v = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
function run(
  name: string,
  behavior: (e: Exercise, occurrence: number) => Outcome,
  seed: number,
  steps = 5000,
) {
  const random = seeded(seed),
    state = createLearningState(exercises, random),
    exposure = new Map<string, number>();
  const transitions: {
    attempt: number;
    unlocked: string;
    window: string[];
    frontierCoverage: number;
    frontierAccuracy: number;
  }[] = [];
  let correct = 0;
  for (let attempt = 1; attempt <= steps; attempt++) {
    const e = nextLearningExercise(state, exercises, random);
    const count = (exposure.get(e.id) ?? 0) + 1;
    exposure.set(e.id, count);
    const outcome = behavior(e, count);
    if (outcome === 'correct') correct++;
    const before = state.curriculum.unlocked.length;
    const frontier = curriculumBands(exercises).find(
      (b) => b.id === state.curriculum.unlocked.at(-1),
    )!;
    recordLearningOutcome(state, e, outcome, exercises, random);
    if (state.curriculum.unlocked.length > before) {
      const progress = bandProgress(frontier, state.results);
      assert.ok(progress.ready);
      transitions.push({
        attempt,
        unlocked: state.curriculum.unlocked.at(-1)!,
        window: activeBands(state, exercises).map((b) => b.id),
        frontierCoverage: Math.round(progress.coverage * 100),
        frontierAccuracy: Math.round(progress.accuracy * 100),
      });
    }
    assert.ok(activeBands(state, exercises).length <= 4);
  }
  const latest = Object.values(state.results),
    correctLatest = latest.filter((r) => r.outcome === 'correct').length;
  return {
    state,
    report: {
      name,
      attempts: steps,
      unlocked: state.curriculum.unlocked.length,
      distinct: exposure.size,
      currentAccuracy: Math.round((100 * correctLatest) / latest.length),
      attemptAccuracy: Math.round((100 * correct) / steps),
      transitions,
    },
  };
}
const perfect = run('Always correct', () => 'correct', 31);
assert.equal(perfect.state.curriculum.unlocked.length, 8);
const errors = run('Always wrong', () => 'error', 32);
const typos = run('Always a typo', () => 'typo', 33);
for (const result of [errors, typos]) {
  assert.equal(result.state.curriculum.unlocked.length, 3);
  assert.equal(Object.keys(result.state.results).length, 450);
}
const past = run(
  'Always wrong on passato prossimo',
  (e) => (e.tense === 'passato_prossimo' ? 'error' : 'correct'),
  34,
);
assert.equal(past.state.curriculum.unlocked.length, 3);
const recovery = run(
  'Two errors, then correct',
  (_e, n) => (n <= 2 ? 'error' : 'correct'),
  35,
  10000,
);
assert.equal(recovery.state.curriculum.unlocked.length, 8);
const person = run('Always wrong on loro', (e) => (e.person === 'loro' ? 'error' : 'correct'), 36);
const random = seeded(37),
  growing = createLearningState(exercises, random);
for (const e of exercises.slice(0, 20))
  recordLearningOutcome(growing, e, 'correct', exercises, random);
const results = JSON.stringify(growing.results),
  unlocks = [...growing.curriculum.unlocked];
const addition = { ...exercises[0]!, id: 'simulation-new-item' };
synchronizeLearningState(growing, [...exercises, addition], random);
assert.equal(JSON.stringify(growing.results), results);
assert.deepEqual(growing.curriculum.unlocked, unlocks);
assert.ok(growing.queue.includes(addition.id));
// Restored progress cannot grow coverage by repeating the same sentence.
const repeated = createLearningState(exercises, random);
for (let n = 0; n < 100; n++)
  recordLearningOutcome(repeated, exercises[0]!, 'correct', exercises, random);
assert.equal(Object.keys(repeated.results).length, 1);
assert.equal(repeated.curriculum.unlocked.length, 3);
console.log(
  JSON.stringify(
    {
      bands: curriculumBands(exercises).map((b) => ({ id: b.id, questions: b.questions.length })),
      scenarios: [perfect, errors, typos, past, recovery, person].map((r) => r.report),
    },
    null,
    2,
  ),
);
