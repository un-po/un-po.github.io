import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newTenseMessages,
  loadPendingUnlocks,
  savePendingUnlocks,
} from '../src/lib/practiceUnlocks.ts';

test('announces only newly available tenses, not additional bands or rolling-window changes', () => {
  const initial = ['presente:1', 'presente:2', 'passato_prossimo:1'];
  const four = [...initial, 'passato_prossimo:2'];
  assert.deepEqual(newTenseMessages(initial, four), []);
  assert.deepEqual(newTenseMessages(four, [...four, 'imperfetto:1']), ['unlock:imperfetto']);
  const all = [...four, 'imperfetto:1', 'imperfetto:2', 'futuro_semplice:1'];
  assert.deepEqual(newTenseMessages(four, all), ['unlock:imperfetto', 'unlock:futuro_semplice']);
  assert.deepEqual(newTenseMessages(all, [...all, 'futuro_semplice:2']), []);
  assert.deepEqual(newTenseMessages(all, all.slice(-4)), []);
});

test('pending celebrations survive visits and are removed after acknowledgement', () => {
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    },
  });
  savePendingUnlocks(['unlock:imperfetto']);
  assert.deepEqual(loadPendingUnlocks(), ['unlock:imperfetto']);
  stored.set(
    'unpo-pending-unlocks-v1',
    JSON.stringify(['unlock:imperfetto', 'unlock:imperfetto', 'unknown', null]),
  );
  assert.deepEqual(loadPendingUnlocks(), ['unlock:imperfetto']);
  savePendingUnlocks([]);
  assert.equal(stored.size, 0);
  assert.deepEqual(loadPendingUnlocks(), []);
  stored.set('unpo-pending-unlocks-v1', 'broken');
  assert.deepEqual(loadPendingUnlocks(), []);
});

test('blocked storage does not prevent practice or celebration', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked');
    },
  });
  assert.deepEqual(loadPendingUnlocks(), []);
  assert.doesNotThrow(() => savePendingUnlocks(['unlock:imperfetto']));
});
