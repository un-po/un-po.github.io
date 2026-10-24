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
test('remembers introduction completion with or without a name', () => {
  assert.equal(saveProfile('  Rico  '), true);
  assert.deepEqual(loadProfile(), { introduced: true, name: 'Rico' });
  saveProfile('');
  assert.deepEqual(loadProfile(), { introduced: true, name: '' });
});
test('invalid profile data falls back safely', () => {
  for (const value of ['bad JSON', 'null', '{}', '{"name":42,"introduced":"yes"}']) {
    stored = value;
    assert.deepEqual(loadProfile(), { introduced: false, name: '' });
  }
});
test('bounds the stored name length', () => {
  saveProfile('a'.repeat(100));
  assert.equal(loadProfile().name.length, 40);
});
test('blocked browser storage does not prevent introduction', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked');
    },
  });
  assert.equal(saveProfile('Rico'), false);
  assert.deepEqual(loadProfile(), { introduced: false, name: '' });
});
