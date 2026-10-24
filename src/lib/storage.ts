import { createLearningState, learningStateVersion, synchronizeLearningState } from './learning.ts';
import type { ContextScore, LearningState, RandomSource } from './learning.ts';
import type { Exercise } from './practice.ts';

export const learningStorageKey = 'unpo-learning-state';

function validContext(value: unknown): value is ContextScore {
  if (value === null || typeof value !== 'object') return false;
  const context = value as Partial<ContextScore>;
  return (
    Number.isFinite(context.score) &&
    context.score! >= 0 &&
    context.score! <= 1 &&
    Number.isInteger(context.samples) &&
    context.samples! >= 0 &&
    Number.isInteger(context.attempts) &&
    context.attempts! >= 0 &&
    Number.isInteger(context.correct) &&
    context.correct! >= 0 &&
    Number.isInteger(context.typos) &&
    context.typos! >= 0 &&
    Number.isInteger(context.errors) &&
    context.errors! >= 0
  );
}

function validContextMap(value: unknown): value is Record<string, ContextScore> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.values(value).every((context) => validContext(context))
  );
}

function validLearningState(value: unknown): value is LearningState {
  if (value === null || typeof value !== 'object') return false;
  const state = value as Partial<LearningState>;
  const learner = state.learner;
  const contexts = state.contexts;
  return (
    state.version === learningStateVersion &&
    learner !== undefined &&
    Number.isInteger(learner.level) &&
    learner.level >= 1 &&
    learner.level <= 25 &&
    Number.isFinite(learner.levelProgress) &&
    learner.levelProgress >= 0 &&
    Number.isFinite(learner.totalMastery) &&
    learner.totalMastery >= 0 &&
    Number.isFinite(learner.missedMastery) &&
    learner.missedMastery >= 0 &&
    learner.levelEvidence !== undefined &&
    Array.isArray(learner.levelEvidence.questions) &&
    learner.levelEvidence.questions.every((value) => typeof value === 'string') &&
    Array.isArray(learner.levelEvidence.verbs) &&
    learner.levelEvidence.verbs.every((value) => typeof value === 'string') &&
    Array.isArray(learner.levelEvidence.persons) &&
    learner.levelEvidence.persons.every((value) =>
      ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'].includes(value),
    ) &&
    Array.isArray(state.queue) &&
    state.queue.every((exerciseId) => typeof exerciseId === 'string') &&
    contexts !== undefined &&
    validContextMap(contexts.questions) &&
    validContextMap(contexts.verbs) &&
    validContextMap(contexts.persons) &&
    validContextMap(contexts.tenses) &&
    state.mastery !== undefined &&
    typeof state.mastery === 'object' &&
    Object.values(state.mastery).every(
      (record) =>
        record !== null &&
        typeof record === 'object' &&
        Number.isFinite(record.earned) &&
        record.earned >= 0 &&
        record.earned <= 1 &&
        Number.isInteger(record.offeredAtLevel) &&
        record.offeredAtLevel >= 1 &&
        ['active', 'retired', 'removed'].includes(record.status),
    ) &&
    state.missStreaks !== undefined &&
    typeof state.missStreaks === 'object' &&
    Object.values(state.missStreaks).every((streak) => Number.isInteger(streak) && streak >= 0)
  );
}

export function saveLearningState(state: LearningState): boolean {
  try {
    localStorage.setItem(learningStorageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadLearningState(
  exercises: Exercise[],
  random: RandomSource = Math.random,
): LearningState {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(learningStorageKey) ?? 'null');
    if (validLearningState(stored)) {
      synchronizeLearningState(stored, exercises, random);
      saveLearningState(stored);
      return stored;
    }
  } catch {
    // Fall through to a clean state.
  }

  const state = createLearningState(exercises, random);
  saveLearningState(state);
  return state;
}

export function clearLearningState(): boolean {
  try {
    localStorage.removeItem(learningStorageKey);
    return true;
  } catch {
    return false;
  }
}
