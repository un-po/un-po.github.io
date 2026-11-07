import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningState, learningStateVersion } from '../src/lib/learning.ts';
import {
  clearLearningState,
  learningStorageKey,
  loadLearningState,
  saveLearningState,
} from '../src/lib/storage.ts';
import type { Exercise } from '../src/lib/practice.ts';

import { exercises } from './content-fixture.ts';
const starterExercises = exercises.filter((exercise) => exercise.level! <= 2);
const random = () => 0.5;
let stored = new Map<string, string>();

function installStorage(): void {
  stored = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    },
  });
}

test('round-trips versioned learning state', () => {
  installStorage();
  const state = createLearningState(exercises, random);
  assert.equal(saveLearningState(state), true);
  assert.deepEqual(loadLearningState(exercises, random), state);
  assert.equal(JSON.parse(stored.get(learningStorageKey)!).version, learningStateVersion);
});

test('rejects corrupt or unknown state versions', () => {
  installStorage();
  for (const raw of ['broken', '{}', 'null', JSON.stringify({ version: 999 })]) {
    stored.set(learningStorageKey, raw);
    const state = loadLearningState(exercises, random);
    assert.equal(state.version, learningStateVersion);
    assert.equal(state.learner.level, 1);
  }
});

test('merges newly eligible questions without resetting progress', () => {
  installStorage();
  const state = createLearningState(starterExercises.slice(0, 3), random);
  state.learner.totalMastery = 2;
  saveLearningState(state);
  const expanded = loadLearningState(starterExercises.slice(0, 6), random);
  assert.equal(expanded.learner.totalMastery, 2);
  assert.equal(new Set(expanded.queue).size, 6);
});

test('clears current learning data', () => {
  installStorage();
  saveLearningState(createLearningState(exercises, random));
  assert.equal(clearLearningState(), true);
  assert.equal(stored.has(learningStorageKey), false);
});

test('storage failures do not interrupt practice', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked');
    },
  });
  const state = loadLearningState(exercises, random);
  assert.equal(state.version, learningStateVersion);
  assert.equal(saveLearningState(state), false);
});

test('version 1 migration replaces the pool without losing earned progress or context', () => {
  installStorage();
  const legacy: any = createLearningState(starterExercises, random);
  legacy.version = 1;
  delete legacy.contentRevision;
  delete legacy.results;
  delete legacy.curriculum;
  legacy.learner.level = 6;
  legacy.learner.levelProgress = 3;
  legacy.learner.totalMastery = 47;
  legacy.learner.missedMastery = 2.6;
  legacy.mastery = { 'presente-1': { earned: 1, offeredAtLevel: 1, status: 'active' } };
  legacy.queue = ['presente-1', 'presente-2'];
  legacy.contexts.tenses.presente = {
    score: 0.8,
    samples: 10,
    attempts: 10,
    correct: 8,
    typos: 0,
    errors: 2,
  };
  stored.set(learningStorageKey, JSON.stringify(legacy));
  const migrated = loadLearningState(exercises, random);
  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.learner, legacy.learner);
  assert.deepEqual(migrated.contexts.tenses.presente, legacy.contexts.tenses.presente);
  assert.equal(migrated.mastery['presente-1']?.earned, 1);
  assert.equal(migrated.mastery['presente-1']?.status, 'active');
  assert.deepEqual(migrated.results, {});
  assert.ok(migrated.curriculum.unlocked.length >= 3);
  assert.ok(
    migrated.queue.length && migrated.queue.every((id) => exercises.some((e) => e.id === id)),
  );
  assert.deepEqual(loadLearningState(exercises, random), migrated);
});

test('version 2 migration preserves unlocked access without inventing matrix accuracy', () => {
  installStorage();
  const legacy: any = createLearningState(exercises, random);
  legacy.version = 2;
  legacy.learner.level = 19;
  legacy.learner.totalMastery = 200;
  delete legacy.results;
  delete legacy.curriculum;
  stored.set(learningStorageKey, JSON.stringify(legacy));
  const migrated = loadLearningState(exercises, random);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.curriculum.unlocked.length, 8);
  assert.equal(migrated.learner.totalMastery, 200);
  assert.deepEqual(migrated.results, {});
  assert.deepEqual(loadLearningState(exercises, random), migrated);
});
