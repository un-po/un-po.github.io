import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfile, saveProfile } from '../src/lib/profile.ts';
let stored: string | null = null;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  },
});
test('remembers completed messages with or without a name', () => {
  assert.equal(saveProfile('  Rico  ', ['introduction']), true);
  assert.deepEqual(loadProfile(), {
    introduced: true,
    name: 'Rico',
    seenMessages: ['introduction'],
  });
  saveProfile('', ['introduction', 'keyboard']);
  assert.deepEqual(loadProfile(), {
    introduced: true,
    name: '',
    seenMessages: ['introduction', 'keyboard'],
  });
});
test('existing introduced profiles skip the new onboarding sequence', () => {
  stored = JSON.stringify({ introduced: true, name: 'Rico' });
  assert.deepEqual(loadProfile().seenMessages, ['introduction', 'keyboard', 'name']);
});
test('migrates question-based onboarding without replaying completed prompts', () => {
  for (const [progress, seen] of [
    [0, []],
    [1, ['introduction']],
    [2, ['introduction']],
    [3, ['introduction', 'keyboard']],
    [5, ['introduction', 'keyboard', 'name']],
  ] as const) {
    stored = JSON.stringify({ introduced: true, onboardingProgress: progress });
    assert.deepEqual(loadProfile().seenMessages, seen);
  }
});
test('saving a name preserves unfinished onboarding and normalizes stored message IDs', () => {
  saveProfile('Rico', ['keyboard', 'keyboard']);
  assert.deepEqual(loadProfile().seenMessages, ['keyboard']);
  stored = JSON.stringify({
    introduced: true,
    seenMessages: ['keyboard', 'unknown', 4, 'keyboard'],
  });
  assert.deepEqual(loadProfile().seenMessages, ['keyboard']);
});
test('invalid profile data falls back safely', () => {
  for (const value of ['bad JSON', 'null', '{}', '{"name":42,"introduced":"yes"}']) {
    stored = value;
    assert.deepEqual(loadProfile(), { introduced: false, name: '', seenMessages: [] });
  }
});
test('bounds the stored name length', () => {
  saveProfile('a'.repeat(100), []);
  assert.equal(loadProfile().name.length, 40);
});
test('blocked browser storage does not prevent practice', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked');
    },
  });
  assert.equal(saveProfile('Rico', []), false);
  assert.deepEqual(loadProfile(), { introduced: false, name: '', seenMessages: [] });
});
