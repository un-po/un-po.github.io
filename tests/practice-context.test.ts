import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialPracticeMessages,
  streakMessage,
  PracticeMessageQueue,
  type PracticeMessage,
  type QueueClock,
} from '../src/lib/practiceContext.ts';

function harness() {
  let now = 0;
  const tasks = new Map<() => void, number>();
  const clock: QueueClock = {
    now: () => now,
    schedule(callback, delay) {
      tasks.set(callback, now + delay);
      return () => {
        tasks.delete(callback);
      };
    },
  };
  const completed: PracticeMessage[] = [];
  const queue = new PracticeMessageQueue(
    () => {},
    (message) => completed.push(message),
    clock,
  );
  function advance(ms: number) {
    const target = now + ms;
    for (;;) {
      const next = [...tasks.entries()].sort((a, b) => a[1] - b[1])[0];
      if (!next || next[1] > target) break;
      now = next[1];
      tasks.delete(next[0]);
      next[0]();
    }
    now = target;
  }
  return { queue, completed, advance };
}

test('initial queue resumes only unfinished prompts and skips asking an existing name', () => {
  assert.deepEqual(initialPracticeMessages([], false), ['introduction', 'keyboard', 'name']);
  assert.deepEqual(initialPracticeMessages(['introduction'], false), ['keyboard', 'name']);
  assert.deepEqual(initialPracticeMessages(['introduction', 'keyboard'], true), [
    'welcome',
    'level',
  ]);
  assert.deepEqual(initialPracticeMessages(['introduction', 'keyboard', 'name'], false), [
    'welcome',
    'level',
  ]);
});
test('messages wait four seconds, reveal, stay twenty seconds, leave, and rest forty seconds', () => {
  const { queue, completed, advance } = harness();
  queue.enqueue(['introduction', 'keyboard']);
  advance(3999);
  assert.equal(queue.state.message, null);
  advance(1);
  assert.deepEqual(queue.state, { phase: 'entering', message: 'introduction' });
  advance(450);
  assert.equal(queue.state.phase, 'visible');
  advance(19999);
  assert.equal(queue.state.phase, 'visible');
  advance(1);
  assert.equal(queue.state.phase, 'leaving');
  advance(350);
  assert.deepEqual(completed, ['introduction']);
  advance(39999);
  assert.deepEqual(queue.state, { phase: 'quiet', message: null });
  advance(1);
  assert.deepEqual(queue.state, { phase: 'entering', message: 'keyboard' });
});
test('pausing preserves the remaining time through long interruptions in every phase', () => {
  const { queue, advance } = harness();
  queue.enqueue(['welcome', 'level']);
  for (const [duration, nextPhase] of [
    [4000, 'entering'],
    [450, 'visible'],
    [20000, 'leaving'],
    [350, 'quiet'],
    [40000, 'entering'],
  ] as const) {
    advance(duration - 1);
    const state = queue.state;
    queue.setPaused(true);
    advance(3600000);
    assert.equal(queue.state, state);
    queue.setPaused(false);
    advance(1);
    assert.equal(queue.state.phase, nextPhase);
  }
});
test('deduplicates producers, retains the quiet period when new content arrives, and expires stale streaks', () => {
  const { queue, completed, advance } = harness();
  queue.enqueue('welcome');
  queue.enqueue('welcome');
  advance(24800);
  queue.enqueue('level');
  queue.enqueue('momentum', 1000);
  advance(40000);
  assert.equal(queue.state.message, 'level');
  advance(60800);
  assert.equal(queue.state.phase, 'idle');
  assert.deepEqual(completed, ['welcome', 'level']);
  queue.enqueue('momentum', 60000);
  assert.equal(queue.state.message, 'momentum');
  queue.dispose();
  advance(120000);
  assert.equal(queue.state.phase, 'entering');
});
test('streak messages require four matching outcomes and remain occasional', () => {
  assert.equal(
    streakMessage(['error', 'error', 'error', 'error'], () => 0),
    'encouragement',
  );
  assert.equal(
    streakMessage(['correct', 'correct', 'correct', 'correct'], () => 0),
    'momentum',
  );
  assert.equal(
    streakMessage(['correct', 'correct', 'correct', 'correct'], () => 0.9),
    null,
  );
  assert.equal(
    streakMessage(['error', 'typo', 'error', 'error'], () => 0),
    null,
  );
  assert.equal(
    streakMessage(['error', 'error', 'error'], () => 0),
    null,
  );
});
