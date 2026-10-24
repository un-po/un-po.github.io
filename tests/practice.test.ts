import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeAnswer, normalize, persons, summarize } from '../src/lib/practice.ts';
import type { Attempt, Exercise, Verb } from '../src/lib/practice.ts';
const verbs: Verb[] = JSON.parse(
  readFileSync(new URL('../src/content/verbs.json', import.meta.url), 'utf8'),
);
const exercises: Exercise[] = JSON.parse(
  readFileSync(new URL('../src/content/exercises.json', import.meta.url), 'utf8'),
).concat(
  JSON.parse(readFileSync(new URL('../src/content/exercises-pilot.json', import.meta.url), 'utf8')),
);
function attempt(exercise: Exercise, outcome: Attempt['outcome'] = 'correct'): Attempt {
  return {
    exerciseId: exercise.id,
    verb: exercise.verb,
    person: exercise.person,
    answer: 'test',
    outcome,
    difficulty: exercise.difficulty,
    timestamp: 1000,
  };
}

test('accepts case and whitespace variations', () => {
  assert.equal(gradeAnswer('  BEVO  ', ['bevo'], verbs), 'correct');
  assert.equal(normalize('  sono   stato '), 'sono stato');
});
test('accepts every reviewed alternative', () => {
  assert.equal(gradeAnswer('andrò', ['vado', 'andrò'], verbs), 'correct');
});
test('does not turn a wrong person into a typo', () => {
  assert.equal(gradeAnswer('parli', ['parlo'], verbs), 'error');
  assert.equal(gradeAnswer('capisci', ['capisco'], verbs), 'error');
});
test('recognizes a valid form of a different verb as a grammatical error', () => {
  assert.equal(gradeAnswer('dormo', ['dorme'], verbs), 'error');
});
test('gives partial credit only to conservative probable typos', () => {
  assert.equal(gradeAnswer('parlamo', ['parliamo'], verbs), 'typo');
  assert.equal(gradeAnswer('bevoo', ['bevo'], verbs), 'error');
  assert.equal(gradeAnswer('banana', ['bevo'], verbs), 'error');
});
test('preserves meaningful accents while normalizing Unicode', () => {
  assert.equal(gradeAnswer('e', ['è'], verbs), 'error');
  assert.equal(gradeAnswer('andro', ['andrò'], verbs), 'error');
  assert.equal(gradeAnswer('e\u0300', ['è'], verbs), 'correct');
});
test('all sentences reference a real verb and its target person', () => {
  assert.equal(new Set(exercises.map((e) => e.id)).size, exercises.length);
  assert.equal(new Set(verbs.map((v) => v.id)).size, verbs.length);
  for (const verb of verbs) assert.equal(verb.forms.length, 6, verb.id);
  for (const exercise of exercises) {
    const verb = verbs.find((v) => v.id === exercise.verb);
    assert.ok(verb, exercise.id);
    assert.ok(exercise.answers.length && exercise.before && exercise.after && exercise.explanation);
    assert.ok(
      exercise.answers.includes(verb.forms[persons.indexOf(exercise.person)]!),
      exercise.id,
    );
    for (const answer of exercise.answers)
      assert.equal(gradeAnswer(answer, exercise.answers, verbs), 'correct');
    assert.ok((exercise.level ?? exercise.difficulty) >= 1);
    assert.ok((exercise.level ?? exercise.difficulty) <= 25);
  }
  for (const person of persons)
    assert.ok(
      exercises.some((e) => e.person === person),
      person,
    );
});
test('summary keeps first-attempt accuracy separate from typo points', () => {
  const correct = attempt(exercises[0]!);
  const typo = attempt(exercises[1]!, 'typo');
  const error = attempt(exercises[2]!, 'error');
  assert.deepEqual(summarize([correct, typo, error]), {
    count: 3,
    accuracy: 33,
    typos: 1,
    score: 24,
    difficulty: 5 / 3,
  });
  assert.deepEqual(summarize([]), { count: 0, accuracy: 0, typos: 0, score: 0, difficulty: 0 });
});
