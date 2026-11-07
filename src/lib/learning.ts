import {
  persons,
  tenses,
  type Exercise,
  type Outcome,
  type Person,
  type Tense,
} from './practice.ts';
import { contentRevision } from './content.ts';

export const learningStateVersion = 3 as const;
const contextLearningRate = 0.25;
const neutralContextScore = 1;
const minimumReturnGap = 8;
export type RandomSource = () => number;
export interface QuestionResult {
  outcome: Outcome;
  tense: Tense | null;
}
export interface Band {
  id: string;
  tense: Tense;
  part: 1 | 2;
  questions: Exercise[];
}

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
  contentRevision: string;
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
  curriculum: { unlocked: string[] };
  results: Record<string, QuestionResult>;
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

const poolBands = new WeakMap<Exercise[], Band[]>();
export function curriculumBands(exercises: Exercise[]): Band[] {
  let bands = poolBands.get(exercises);
  if (!bands) {
    bands = tenses
      .flatMap((tense) =>
        ([1, 2] as const).map((part) => ({
          id: `${tense}:${part}`,
          tense,
          part,
          questions: exercises.filter((e) => exerciseTense(e) === tense && (e.band ?? 1) === part),
        })),
      )
      .filter((band) => band.questions.length > 0);
    poolBands.set(exercises, bands);
  }
  return bands;
}
export function exerciseTense(exercise: Exercise): Tense {
  return (exercise.tense ?? 'presente') as Tense;
}
export function bandProgress(band: Band, results: LearningState['results']) {
  let covered = 0,
    correct = 0;
  for (const question of band.questions) {
    const result = results[question.id];
    if (result) {
      covered++;
      if (result.outcome === 'correct') correct++;
    }
  }
  const total = band.questions.length;
  const coverage = total ? covered / total : 0;
  const accuracy = covered ? correct / covered : 0;
  // Integer comparisons avoid rounding an almost-passing percentage into an unlock.
  const ready =
    covered > 0 &&
    ((covered === total && correct * 100 >= covered * 70) ||
      (covered * 100 >= total * 80 && correct * 100 >= covered * 85) ||
      (covered * 100 >= total * 60 && correct === covered));
  return { total, covered, correct, coverage, accuracy, ready };
}
export function activeBands(state: LearningState, exercises: Exercise[]): Band[] {
  return curriculumBands(exercises)
    .filter((b) => state.curriculum.unlocked.includes(b.id))
    .slice(-4);
}
function available(exercise: Exercise, state: LearningState, exercises: Exercise[]): boolean {
  const bands = activeBands(state, exercises);
  return (
    bands.some((b) => b.id === `${exerciseTense(exercise)}:${exercise.band ?? 1}`) &&
    (exercise.acceptedAnswers ?? []).every((a) =>
      curriculumBands(exercises).some(
        (b) => b.tense === a.tense && state.curriculum.unlocked.includes(b.id),
      ),
    )
  );
}
function emptyContext(): ContextScore {
  return { score: 1, samples: 0, attempts: 0, correct: 0, typos: 0, errors: 0 };
}
export function createLearningState(
  exercises: Exercise[],
  random: RandomSource = Math.random,
): LearningState {
  const state: LearningState = {
    version: learningStateVersion,
    contentRevision,
    // Archived legacy records remain intact for migration and future ruler work.
    learner: {
      level: 1,
      levelProgress: 0,
      totalMastery: 0,
      missedMastery: 0,
      levelEvidence: { questions: [], verbs: [], persons: [] },
    },
    mastery: {},
    curriculum: {
      unlocked: curriculumBands(exercises)
        .slice(0, 3)
        .map((b) => b.id),
    },
    results: {},
    queue: [],
    contexts: { questions: {}, verbs: {}, persons: {}, tenses: {} },
    missStreaks: {},
  };
  return synchronizeLearningState(state, exercises, random);
}
export function synchronizeLearningState(
  state: LearningState,
  exercises: Exercise[],
  random: RandomSource = Math.random,
): LearningState {
  state.contentRevision = contentRevision;
  const bands = curriculumBands(exercises);
  // Canonical order prevents imported/debug unlock lists changing the rolling window.
  state.curriculum.unlocked = bands
    .filter((b, index) => index < 3 || state.curriculum.unlocked.includes(b.id))
    .map((b) => b.id);
  const allowed = new Set(exercises.filter((e) => available(e, state, exercises)).map((e) => e.id));
  const seen = new Set<string>();
  state.queue = state.queue.filter((id) => {
    if (!allowed.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const additions = [...allowed].filter((id) => !seen.has(id));
  for (let i = additions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [additions[i], additions[j]] = [additions[j]!, additions[i]!];
  }
  // Preserve existing relative order while blending newly eligible items.
  for (const id of additions)
    state.queue.splice(Math.floor(random() * (state.queue.length + 1)), 0, id);
  return state;
}
function unlockNext(state: LearningState, exercises: Exercise[], random: RandomSource) {
  const bands = curriculumBands(exercises);
  const unlocked = bands.filter((b) => state.curriculum.unlocked.includes(b.id));
  const frontier = unlocked.at(-1);
  const next = bands.find((b) => !state.curriculum.unlocked.includes(b.id));
  const outgoing = unlocked.length >= 4 ? unlocked.at(-4) : undefined;
  if (
    frontier &&
    next &&
    bandProgress(frontier, state.results).ready &&
    (!outgoing || bandProgress(outgoing, state.results).ready)
  ) {
    state.curriculum.unlocked.push(next.id);
    synchronizeLearningState(state, exercises, random);
  }
}
export function recordLearningOutcome(
  state: LearningState,
  exercise: Exercise,
  outcome: Outcome,
  exercises: Exercise[],
  random: RandomSource = Math.random,
  demonstratedTense: string | null = exerciseTense(exercise),
): LearningState {
  updateContexts(state, exercise, outcome, demonstratedTense);
  state.results[exercise.id] = { outcome, tense: demonstratedTense as Tense | null };
  if (available(exercise, state, exercises))
    reinsertAnsweredExercise(state, exercise, outcome, random);
  else state.queue = state.queue.filter((id) => id !== exercise.id);
  unlockNext(state, exercises, random);
  return state;
}
export function nextLearningExercise(
  state: LearningState,
  exercises: Exercise[],
  random: RandomSource = Math.random,
): Exercise {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let next = state.queue.map((id) => byId.get(id)).find(Boolean);
  if (!next) {
    synchronizeLearningState(state, exercises, random);
    next = state.queue.map((id) => byId.get(id)).find(Boolean);
  }
  if (!next) throw new Error('No eligible exercises available');
  return next;
}
function updateContext(record: ContextScore | undefined, outcome: Outcome): ContextScore {
  const next = record ?? emptyContext();
  const value = outcome === 'correct' ? 1 : outcome === 'typo' ? 0.4 : 0;
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
    const center = 20 * 2 ** Math.min(10, streak - 1);
    return Math.max(minimumReturnGap, Math.round(center * (0.8 + random() * 0.4)));
  }
  const streak = (state.missStreaks[exercise.id] ?? 0) + 1;
  state.missStreaks[exercise.id] = streak;
  const center = 12 * 2 ** Math.min(10, streak - 1);
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

function updateContexts(
  state: LearningState,
  exercise: Exercise,
  outcome: Outcome,
  demonstratedTense: string | null,
): void {
  state.contexts.questions[exercise.id] = updateContext(
    state.contexts.questions[exercise.id],
    outcome,
  );
  state.contexts.verbs[exercise.verb] = updateContext(state.contexts.verbs[exercise.verb], outcome);
  state.contexts.persons[exercise.person] = updateContext(
    state.contexts.persons[exercise.person],
    outcome,
  );
  if (demonstratedTense !== null) {
    state.contexts.tenses[demonstratedTense] = updateContext(
      state.contexts.tenses[demonstratedTense],
      outcome,
    );
  }
}
