import test from 'node:test';
import assert from 'node:assert/strict';
import { clearHistory, loadHistory, saveHistory } from '../src/lib/storage.ts';
import type { Attempt } from '../src/lib/practice.ts';
let stored: string | null = null;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
    removeItem: () => {
      stored = null;
    },
  },
});
const record: Attempt = {
  exerciseId: 'presente-01',
  verb: 'bere',
  person: 'io',
  answer: 'bevo',
  outcome: 'correct',
  difficulty: 2,
  timestamp: 1000,
};
test('round-trips a valid attempt', () => {
  assert.equal(saveHistory([record]), true);
  assert.deepEqual(loadHistory(), [record]);
});
test('rejects corrupt and malformed history', () => {
  for (const raw of [
    'broken',
    '{}',
    'null',
    '[null, {}, 7]',
    JSON.stringify([{ ...record, outcome: 'other' }]),
    JSON.stringify([{ ...record, difficulty: -1 }]),
  ]) {
    stored = raw;
    assert.deepEqual(loadHistory(), []);
  }
});
test('caps retained history to 500 attempts', () => {
  saveHistory(Array.from({ length: 700 }, () => record));
  assert.equal(loadHistory().length, 500);
});
test('clears only the saved practice history', () => {
  saveHistory([record]);
  assert.equal(clearHistory(), true);
  assert.deepEqual(loadHistory(), []);
});
test('storage failures do not interrupt practice', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked');
    },
  });
  assert.deepEqual(loadHistory(), []);
  assert.equal(saveHistory([record]), false);
});
