import { persons, tenses, type Exercise, type Verb } from './practice.ts';
import { bandProgress, curriculumBands, type Band, type LearningState } from './learning.ts';
export interface AccuracyCell {
  covered: number;
  correct: number;
}
export function feedbackRows(
  results: LearningState['results'],
  exercises: Exercise[],
  verbs: Verb[],
) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const byVerb = new Map(verbs.map((v) => [v.id, v]));
  return tenses.map((tense) => {
    const cells: AccuracyCell[] = Array.from({ length: 8 }, () => ({ covered: 0, correct: 0 }));
    for (const [id, result] of Object.entries(results)) {
      const exercise = byId.get(id);
      if (!exercise || result.tense !== tense) continue;
      const verb = byVerb.get(exercise.verb);
      const irregular = verb?.irregularTenses?.[tense] ?? verb?.irregular ?? false;
      for (const column of [persons.indexOf(exercise.person), irregular ? 7 : 6]) {
        const cell = cells[column]!;
        cell.covered++;
        if (result.outcome === 'correct') cell.correct++;
      }
    }
    return { tense, cells };
  });
}
export function accuracyChange(before: AccuracyCell, after: AccuracyCell): -1 | 0 | 1 {
  if (!before.covered || !after.covered) return 0;
  return Math.sign(after.correct * before.covered - before.correct * after.covered) as -1 | 0 | 1;
}

// Productive correct answers: new questions or corrections, not repetitions of
// already-correct questions. These are alternative routes, not a timer/promise.
export function answersToQualify(band: Band, results: LearningState['results']) {
  const progress = bandProgress(band, results);
  if (progress.ready) return { minimum: 0, maximum: 0 };
  const routes = [
    [60, 100],
    [80, 85],
    [100, 70],
  ].map(([coverage, accuracy]) => {
    const visited = Math.max(progress.covered, Math.ceil((progress.total * coverage!) / 100));
    const newQuestions = visited - progress.covered;
    return Math.max(newQuestions, Math.ceil((visited * accuracy!) / 100) - progress.correct);
  });
  return { minimum: Math.min(...routes), maximum: Math.max(...routes) };
}

export function nextUnlockEstimate(state: LearningState, exercises: Exercise[]) {
  const bands = curriculumBands(exercises);
  const count = bands.filter((b) => state.curriculum.unlocked.includes(b.id)).length;
  if (count === bands.length) return null;
  // Prefer the next entirely locked tense; reaching it may require an intermediate band.
  const targetIndex = bands.findIndex(
    (band, index) =>
      index >= count && !bands.slice(0, count).some((opened) => opened.tense === band.tense),
  );
  const target = targetIndex >= 0 ? targetIndex : count;
  const required = new Set<Band>();
  for (let index = count; index <= target; index++) {
    if (bands[index - 1]) required.add(bands[index - 1]!);
    if (index >= 4) required.add(bands[index - 4]!);
  }
  let minimum = 0,
    maximum = 0;
  for (const band of required) {
    const range = answersToQualify(band, state.results);
    minimum += range.minimum;
    maximum += range.maximum;
  }
  return { target: bands[target]!, minimum, maximum };
}
