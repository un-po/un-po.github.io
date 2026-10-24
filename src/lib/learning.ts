import type { Exercise, Outcome, Person } from './practice.ts';

export const learningStateVersion = 1 as const;
export const maximumLearnerLevel = 25;
export const italianoVeroLevel = 21;

const contextLearningRate = 0.25;
const neutralContextScore = 1;
const minimumReturnGap = 3;

export interface ContextScore {
  score: number;
  samples: number;
  attempts: number;
  correct: number;
  typos: number;
  errors: number;
}

export interface MasteryRecord {
  earned: number;
  offeredAtLevel: number;
  status: 'active' | 'retired' | 'removed';
}

export interface LearningState {
  version: typeof learningStateVersion;
  learner: {
    level: number;
    levelProgress: number;
    totalMastery: number;
    missedMastery: number;
    levelEvidence: {
      questions: string[];
      verbs: string[];
      persons: Person[];
    };
  };
  queue: string[];
  contexts: {
    questions: Record<string, ContextScore>;
    verbs: Record<string, ContextScore>;
    persons: Partial<Record<Person, ContextScore>>;
    tenses: Record<string, ContextScore>;
  };
  mastery: Record<string, MasteryRecord>;
  missStreaks: Record<string, number>;
}

export type RandomSource = () => number;

export function exerciseLevel(exercise: Exercise): number {
  return Math.max(1, Math.min(maximumLearnerLevel, exercise.level ?? exercise.difficulty));
}

export function exerciseTense(exercise: Exercise): string {
  return exercise.tense ?? 'presente';
}

export function masteryValue(outcome: Outcome): number {
  return outcome === 'correct' ? 1 : outcome === 'typo' ? 0.4 : 0;
}

export function masteryTarget(level: number): number {
  return level === 1 ? 6 : level === 2 ? 8 : 10;
}

export function activeLevelRange(level: number, exercises: Exercise[]) {
  const highestQuestionLevel = Math.max(1, ...exercises.map(exerciseLevel));
  return {
    minimum: Math.min(Math.max(1, level - 4), highestQuestionLevel),
    maximum: Math.min(maximumLearnerLevel, level + 1),
  };
}

export function maximumReachableLevel(exercises: Exercise[]): number {
  const highestQuestionLevel = Math.max(1, ...exercises.map(exerciseLevel));
  return Math.min(maximumLearnerLevel, highestQuestionLevel + 4);
}

function emptyContext(): ContextScore {
  return {
    score: neutralContextScore,
    samples: 0,
    attempts: 0,
    correct: 0,
    typos: 0,
    errors: 0,
  };
}

export function createLearningState(
  exercises: Exercise[],
  random: RandomSource = Math.random,
): LearningState {
  const state: LearningState = {
    version: learningStateVersion,
    learner: {
      level: 1,
      levelProgress: 0,
      totalMastery: 0,
      missedMastery: 0,
      levelEvidence: { questions: [], verbs: [], persons: [] },
    },
    queue: [],
    contexts: { questions: {}, verbs: {}, persons: {}, tenses: {} },
    mastery: {},
    missStreaks: {},
  };
  synchronizeLearningState(state, exercises, random);
  return state;
}

function isEligible(exercise: Exercise, range: ReturnType<typeof activeLevelRange>): boolean {
  const level = exerciseLevel(exercise);
  return level >= range.minimum && level <= range.maximum;
}

function insertionIndex(
  exercise: Exercise,
  state: LearningState,
  exercises: Exercise[],
  random: RandomSource,
): number {
  if (!state.queue.length) return 0;
  const range = activeLevelRange(state.learner.level, exercises);
  const span = Math.max(1, range.maximum - range.minimum);
  const levelBias = ((exerciseLevel(exercise) - range.minimum) / span) * 0.35;
  const percentile = Math.min(1, (random() + levelBias) / 1.35);
  return Math.round(percentile * state.queue.length);
}

export function synchronizeLearningState(
  state: LearningState,
  exercises: Exercise[],
  random: RandomSource = Math.random,
): LearningState {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const range = activeLevelRange(state.learner.level, exercises);

  for (const [exerciseId, record] of Object.entries(state.mastery)) {
    if (record.status !== 'active') continue;
    const exercise = exerciseById.get(exerciseId);
    if (!exercise) {
      record.status = 'removed';
    } else if (exerciseLevel(exercise) < range.minimum) {
      state.learner.missedMastery += 1 - record.earned;
      record.status = 'retired';
    }
  }

  const seen = new Set<string>();
  state.queue = state.queue.filter((exerciseId) => {
    const exercise = exerciseById.get(exerciseId);
    const isUnseenCarryover =
      exercise && !state.mastery[exerciseId] && exerciseLevel(exercise) < range.minimum;
    if (!exercise || seen.has(exerciseId) || (!isEligible(exercise, range) && !isUnseenCarryover))
      return false;
    seen.add(exerciseId);
    return true;
  });

  for (const exercise of exercises) {
    if (!isEligible(exercise, range)) continue;
    if (!seen.has(exercise.id)) {
      state.queue.splice(insertionIndex(exercise, state, exercises, random), 0, exercise.id);
      seen.add(exercise.id);
    }
  }
  return state;
}

function updateContext(record: ContextScore | undefined, outcome: Outcome): ContextScore {
  const next = record ?? emptyContext();
  const value = masteryValue(outcome);
  next.score = next.score * (1 - contextLearningRate) + value * contextLearningRate;
  next.samples += 1;
  next.attempts += 1;
  if (outcome === 'correct') next.correct += 1;
  else if (outcome === 'typo') next.typos += 1;
  else next.errors += 1;
  return next;
}

function contextualStrength(state: LearningState, exercise: Exercise): number {
  const records: Array<[ContextScore | undefined, number]> = [
    [state.contexts.questions[exercise.id], 5],
    [state.contexts.verbs[exercise.verb], 3],
    [state.contexts.persons[exercise.person], 1],
    [state.contexts.tenses[exerciseTense(exercise)], 1],
  ];
  let weightedScore = 0;
  let totalWeight = 0;
  for (const [record, weight] of records) {
    const confidence = Math.min(1, (record?.samples ?? 0) / 5);
    const score = neutralContextScore - confidence * (neutralContextScore - (record?.score ?? 1));
    weightedScore += score * weight;
    totalWeight += weight;
  }
  return weightedScore / totalWeight;
}

function randomInteger(minimum: number, maximum: number, random: RandomSource): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function baseReturnDistance(
  state: LearningState,
  exercise: Exercise,
  outcome: Outcome,
  random: RandomSource,
): number {
  if (outcome === 'correct') {
    state.missStreaks[exercise.id] = 0;
    return state.queue.length;
  }
  if (outcome === 'typo') {
    const streak = (state.missStreaks[exercise.id] ?? 0) + 1;
    state.missStreaks[exercise.id] = streak;
    const center = 10 * 2 ** (streak - 1);
    return Math.max(minimumReturnGap, Math.round(center * (0.8 + random() * 0.4)));
  }
  const streak = (state.missStreaks[exercise.id] ?? 0) + 1;
  state.missStreaks[exercise.id] = streak;
  const center = 4 * 2 ** (streak - 1);
  return Math.max(minimumReturnGap, Math.round(center * (0.8 + random() * 0.4)));
}

function reinsertAnsweredExercise(
  state: LearningState,
  exercise: Exercise,
  outcome: Outcome,
  random: RandomSource,
): void {
  state.queue = state.queue.filter((exerciseId) => exerciseId !== exercise.id);
  const baseDistance = baseReturnDistance(state, exercise, outcome, random);
  const strength = contextualStrength(state, exercise);
  const contextFactor = 0.75 + strength * 0.25;
  const distance = Math.max(
    outcome === 'correct' ? 0 : minimumReturnGap,
    Math.min(state.queue.length, Math.round(baseDistance * contextFactor)),
  );
  state.queue.splice(distance, 0, exercise.id);
}

function updateContexts(state: LearningState, exercise: Exercise, outcome: Outcome): void {
  state.contexts.questions[exercise.id] = updateContext(
    state.contexts.questions[exercise.id],
    outcome,
  );
  state.contexts.verbs[exercise.verb] = updateContext(state.contexts.verbs[exercise.verb], outcome);
  state.contexts.persons[exercise.person] = updateContext(
    state.contexts.persons[exercise.person],
    outcome,
  );
  const tense = exerciseTense(exercise);
  state.contexts.tenses[tense] = updateContext(state.contexts.tenses[tense], outcome);
}

function awardMastery(state: LearningState, exercise: Exercise, outcome: Outcome): void {
  const record = (state.mastery[exercise.id] ??= {
    earned: 0,
    offeredAtLevel: state.learner.level,
    status: 'active',
  });
  if (!record || record.status !== 'active') return;
  const improvement = Math.max(0, masteryValue(outcome) - record.earned);
  record.earned += improvement;
  state.learner.levelProgress += improvement;
  state.learner.totalMastery += improvement;
  if (improvement > 0) {
    if (!state.learner.levelEvidence.questions.includes(exercise.id))
      state.learner.levelEvidence.questions.push(exercise.id);
    if (!state.learner.levelEvidence.verbs.includes(exercise.verb))
      state.learner.levelEvidence.verbs.push(exercise.verb);
    if (!state.learner.levelEvidence.persons.includes(exercise.person))
      state.learner.levelEvidence.persons.push(exercise.person);
  }
}

function hasLevelBreadth(state: LearningState, exercises: Exercise[]): boolean {
  const range = activeLevelRange(state.learner.level, exercises);
  const available = exercises.filter((exercise) => isEligible(exercise, range));
  const requiredVerbs = Math.min(3, new Set(available.map((exercise) => exercise.verb)).size);
  const requiredPersons = Math.min(3, new Set(available.map((exercise) => exercise.person)).size);
  return (
    state.learner.levelEvidence.verbs.length >= requiredVerbs &&
    state.learner.levelEvidence.persons.length >= requiredPersons
  );
}

function advanceLevel(state: LearningState, exercises: Exercise[], random: RandomSource): void {
  const cap = maximumReachableLevel(exercises);
  while (
    state.learner.level < cap &&
    state.learner.levelProgress >= masteryTarget(state.learner.level) &&
    hasLevelBreadth(state, exercises)
  ) {
    state.learner.levelProgress -= masteryTarget(state.learner.level);
    state.learner.level += 1;
    state.learner.levelEvidence = { questions: [], verbs: [], persons: [] };
    synchronizeLearningState(state, exercises, random);
  }
  if (state.learner.level >= cap) {
    state.learner.levelProgress = Math.min(
      state.learner.levelProgress,
      masteryTarget(state.learner.level),
    );
  }
}

export function recordLearningOutcome(
  state: LearningState,
  exercise: Exercise,
  outcome: Outcome,
  exercises: Exercise[],
  random: RandomSource = Math.random,
): LearningState {
  updateContexts(state, exercise, outcome);
  awardMastery(state, exercise, outcome);
  reinsertAnsweredExercise(state, exercise, outcome, random);
  advanceLevel(state, exercises, random);
  const range = activeLevelRange(state.learner.level, exercises);
  if (!isEligible(exercise, range)) synchronizeLearningState(state, exercises, random);
  return state;
}

export function nextLearningExercise(
  state: LearningState,
  exercises: Exercise[],
  random: RandomSource = Math.random,
): Exercise {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  let next = state.queue.map((exerciseId) => exerciseById.get(exerciseId)).find(Boolean);
  if (!next) {
    synchronizeLearningState(state, exercises, random);
    next = state.queue.map((exerciseId) => exerciseById.get(exerciseId)).find(Boolean);
  }
  if (!next) throw new Error('No eligible exercises available');
  return next;
}

export function levelProgress(state: LearningState, exercises: Exercise[]) {
  const atContentLimit = state.learner.level >= maximumReachableLevel(exercises);
  return {
    current: state.learner.levelProgress,
    target: masteryTarget(state.learner.level),
    nextLevel: Math.min(maximumLearnerLevel, state.learner.level + 1),
    atContentLimit,
    nextRankLevel:
      state.learner.level >= italianoVeroLevel
        ? null
        : Math.min(italianoVeroLevel, Math.floor((state.learner.level - 1) / 5) * 5 + 6),
  };
}
