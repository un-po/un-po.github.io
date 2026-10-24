import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLearningState, learningStateVersion } from '../src/lib/learning.ts';
import {
  clearLearningState,
  learningStorageKey,
  loadLearningState,
  saveLearningState,
} from '../src/lib/storage.ts';
import type { Exercise } from '../src/lib/practice.ts';

const exercises: Exercise[] = JSON.parse(
  readFileSync(new URL('../src/content/exercises.json', import.meta.url), 'utf8'),
);
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
  const state = createLearningState(exercises.slice(0, 3), random);
  state.learner.totalMastery = 2;
  saveLearningState(state);
  const expanded = loadLearningState(exercises.slice(0, 6), random);
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
