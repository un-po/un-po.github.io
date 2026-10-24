import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLearningState,
  masteryTarget,
  nextLearningExercise,
  recordLearningOutcome,
  synchronizeLearningState,
} from '../src/lib/learning.ts';
import type { Exercise, Person } from '../src/lib/practice.ts';

const people: Person[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];
const random = () => 0.5;

function pool(size = 20): Exercise[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `question-${index + 1}`,
    verb: `verb-${index % 4}`,
    person: people[index % people.length]!,
    tense: 'presente',
    level: index < size / 2 ? 1 : 2,
    difficulty: index < size / 2 ? 1 : 2,
    before: 'Prima',
    after: 'dopo.',
    answers: ['forma'],
    explanation: 'Spiegazione.',
  }));
}

test('initializes one randomized queue entry for every eligible question', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  assert.equal(state.queue.length, exercises.length);
  assert.equal(new Set(state.queue).size, exercises.length);
  assert.equal(nextLearningExercise(state, exercises, random).id, state.queue[0]);
});

test('returns errors soon and correct answers near the back', () => {
  const exercises = pool();
  const errorState = createLearningState(exercises, random);
  const errorQuestion = nextLearningExercise(errorState, exercises, random);
  recordLearningOutcome(errorState, errorQuestion, 'error', exercises, random);
  assert.ok(errorState.queue.indexOf(errorQuestion.id) >= 3);
  assert.ok(errorState.queue.indexOf(errorQuestion.id) <= 5);

  const correctState = createLearningState(exercises, random);
  const correctQuestion = nextLearningExercise(correctState, exercises, random);
  recordLearningOutcome(correctState, correctQuestion, 'correct', exercises, random);
  assert.equal(correctState.queue.at(-1), correctQuestion.id);
});

test('awards only the improvement in mastery for a question', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  const question = nextLearningExercise(state, exercises, random);
  recordLearningOutcome(state, question, 'typo', exercises, random);
  assert.equal(state.mastery[question.id]?.earned, 0.4);
  assert.equal(state.learner.totalMastery, 0.4);
  recordLearningOutcome(state, question, 'correct', exercises, random);
  assert.equal(state.mastery[question.id]?.earned, 1);
  assert.equal(state.learner.totalMastery, 1);
  recordLearningOutcome(state, question, 'correct', exercises, random);
  assert.equal(state.learner.totalMastery, 1);
});

test('updates rolling and transparent statistics along every context axis', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  const question = nextLearningExercise(state, exercises, random);
  recordLearningOutcome(state, question, 'error', exercises, random);
  for (const context of [
    state.contexts.questions[question.id],
    state.contexts.verbs[question.verb],
    state.contexts.persons[question.person],
    state.contexts.tenses.presente,
  ]) {
    assert.equal(context?.attempts, 1);
    assert.equal(context?.errors, 1);
    assert.ok(context!.score < 1);
  }
});

test('records unearned mastery only after an attempted question leaves the window', () => {
  const exercises = pool();
  const state = createLearningState(exercises, random);
  const levelOne = exercises[0]!;
  recordLearningOutcome(state, levelOne, 'typo', exercises, random);
  state.learner.level = 6;
  synchronizeLearningState(state, exercises, random);
  assert.equal(state.mastery[levelOne.id]?.status, 'retired');
  assert.equal(state.learner.missedMastery, 0.6);
});

test('uses fast early targets and stable later targets', () => {
  assert.equal(masteryTarget(1), 6);
  assert.equal(masteryTarget(2), 8);
  assert.equal(masteryTarget(3), 10);
  assert.equal(masteryTarget(20), 10);
});
