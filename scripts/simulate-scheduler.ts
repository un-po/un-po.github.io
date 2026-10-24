import assert from 'node:assert/strict';
import {
  createLearningState,
  italianoVeroLevel,
  nextLearningExercise,
  recordLearningOutcome,
  synchronizeLearningState,
} from '../src/lib/learning.ts';
import type { LearningState, RandomSource } from '../src/lib/learning.ts';
import type { Exercise, Outcome, Person } from '../src/lib/practice.ts';

const people: Person[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];
const tenses = ['presente', 'passato-prossimo', 'imperfetto'];

function seededRandom(seed: number): RandomSource {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticPool(size = 500, highestLevel = 15): Exercise[] {
  return Array.from({ length: size }, (_, index) => {
    const level = (index % highestLevel) + 1;
    return {
      id: `simulation-${String(index + 1).padStart(3, '0')}`,
      verb: `verbo-${index % 20}`,
      person: people[index % people.length]!,
      tense: tenses[Math.floor((level - 1) / 5)] ?? tenses.at(-1)!,
      before: 'Prima',
      after: 'dopo.',
      answers: ['forma'],
      explanation: 'Spiegazione.',
      difficulty: level,
      level,
    };
  });
}

interface SimulationResult {
  state: LearningState;
  seen: Set<string>;
  exposure: Map<string, number>;
}

export function simulate(
  exercises: Exercise[],
  steps: number,
  outcome: (exercise: Exercise, occurrence: number) => Outcome,
  seed = 1,
  initialState?: LearningState,
): SimulationResult {
  const random = seededRandom(seed);
  const state = initialState ?? createLearningState(exercises, random);
  const seen = new Set<string>();
  const exposure = new Map<string, number>();
  for (let step = 0; step < steps; step += 1) {
    const exercise = nextLearningExercise(state, exercises, random);
    const occurrence = (exposure.get(exercise.id) ?? 0) + 1;
    exposure.set(exercise.id, occurrence);
    seen.add(exercise.id);
    recordLearningOutcome(state, exercise, outcome(exercise, occurrence), exercises, random);
  }
  return { state, seen, exposure };
}

function summary(result: SimulationResult) {
  return {
    level: result.state.learner.level,
    levelProgress: Number(result.state.learner.levelProgress.toFixed(1)),
    totalMastery: Number(result.state.learner.totalMastery.toFixed(1)),
    missedMastery: Number(result.state.learner.missedMastery.toFixed(1)),
    uniqueQuestions: result.seen.size,
  };
}

const pool = syntheticPool();
const perfect = simulate(pool, 2000, () => 'correct', 11);
assert.equal(perfect.state.learner.level, 19);
assert.ok(perfect.state.learner.level < italianoVeroLevel);
assert.equal(perfect.state.learner.totalMastery, 500);

const neverCorrect = simulate(pool, 2000, () => 'error', 12);
assert.equal(neverCorrect.state.learner.level, 1);
assert.equal(neverCorrect.state.learner.totalMastery, 0);
assert.ok(neverCorrect.seen.size >= 60);

const typoOnly = simulate(pool, 2500, () => 'typo', 13);
assert.ok(typoOnly.state.learner.level > 1);
assert.ok(typoOnly.state.learner.level < italianoVeroLevel);
assert.ok(typoOnly.state.learner.totalMastery < perfect.state.learner.totalMastery);

const recovering = simulate(
  pool,
  2000,
  (_exercise, occurrence) => (occurrence <= 2 ? 'error' : 'correct'),
  14,
);
assert.ok(recovering.state.learner.level > 1);
assert.ok(
  recovering.state.learner.totalMastery > 150,
  `recovery mastery was ${recovering.state.learner.totalMastery}`,
);

const personWeakness = simulate(
  pool,
  1500,
  (exercise) => (exercise.person === 'loro' ? 'error' : 'correct'),
  15,
);
const loroExposure = [...personWeakness.exposure]
  .filter(([id]) => pool.find((exercise) => exercise.id === id)?.person === 'loro')
  .reduce((total, [, count]) => total + count, 0);
assert.ok(loroExposure / 1500 > 1 / people.length);
assert.ok(loroExposure / 1500 < 0.5);

const firstBatch = pool.filter((exercise) => exercise.level! <= 6);
const beforeGrowth = simulate(firstBatch, 800, () => 'correct', 16);
const levelBeforeGrowth = beforeGrowth.state.learner.level;
const masteryBeforeGrowth = beforeGrowth.state.learner.totalMastery;
const queuePrefix = beforeGrowth.state.queue
  .slice(0, 10)
  .filter((id) => firstBatch.some((exercise) => exercise.id === id));
const growthRandom = seededRandom(17);
synchronizeLearningState(beforeGrowth.state, pool, growthRandom);
assert.equal(beforeGrowth.state.learner.level, levelBeforeGrowth);
assert.equal(beforeGrowth.state.learner.totalMastery, masteryBeforeGrowth);
assert.deepEqual(
  beforeGrowth.state.queue.filter((id) => queuePrefix.includes(id)).slice(0, queuePrefix.length),
  queuePrefix,
);
const afterGrowth = simulate(pool, 1800, () => 'correct', 18, beforeGrowth.state);
assert.ok(afterGrowth.state.learner.level > levelBeforeGrowth);
assert.ok(afterGrowth.state.learner.level < italianoVeroLevel);

console.log(
  JSON.stringify(
    {
      perfect: summary(perfect),
      neverCorrect: summary(neverCorrect),
      typoOnly: summary(typoOnly),
      recovery: summary(recovering),
      personWeakness: {
        ...summary(personWeakness),
        loroExposurePercent: Math.round((loroExposure / 1500) * 100),
      },
      poolGrowth: {
        before: { level: levelBeforeGrowth, mastery: masteryBeforeGrowth },
        after: summary(afterGrowth),
      },
    },
    null,
    2,
  ),
);
