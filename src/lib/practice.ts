export type Outcome = 'correct' | 'typo' | 'error';
export type Person = 'io' | 'tu' | 'lui/lei' | 'noi' | 'voi' | 'loro';
export const persons: Person[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];
export interface Verb {
  id: string;
  family: 'are' | 'ere' | 'ire';
  irregular: boolean;
  forms: string[];
}
export interface Exercise {
  id: string;
  verb: string;
  person: Person;
  before: string;
  after: string;
  answers: string[];
  explanation: string;
  difficulty: number;
  level?: number;
  tense?: string;
}
export interface Attempt {
  exerciseId: string;
  verb: string;
  person: Person;
  answer: string;
  outcome: Outcome;
  difficulty: number;
  timestamp: number;
}
export function normalize(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase('it').replace(/\s+/g, ' ');
}
export function editDistance(left: string, right: string): number {
  const a = [...left];
  const b = [...right];
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        next[j - 1]! + 1,
        row[j]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    row = next;
  }
  return row[b.length]!;
}
const withoutAccents = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');
export function gradeAnswer(answer: string, accepted: string[], verbs: Verb[]): Outcome {
  const value = normalize(answer);
  const targets = accepted.map(normalize);
  if (targets.includes(value)) return 'correct';
  // A real conjugation, even one letter away, is a grammatical error.
  if (verbs.some((verb) => verb.forms.some((form) => normalize(form) === value))) return 'error';
  if (targets.some((target) => withoutAccents(target) === withoutAccents(value))) return 'error';
  if (
    value.length >= 5 &&
    targets.some((target) => target.length >= 5 && editDistance(value, target) === 1)
  )
    return 'typo';
  return 'error';
}
export function points(attempt: Attempt): number {
  return (
    (attempt.outcome === 'correct' ? 10 : attempt.outcome === 'typo' ? 4 : 0) * attempt.difficulty
  );
}
export function summarize(attempts: Attempt[]) {
  const count = attempts.length;
  return {
    count,
    accuracy: count
      ? Math.round((attempts.filter((a) => a.outcome === 'correct').length / count) * 100)
      : 0,
    typos: attempts.filter((a) => a.outcome === 'typo').length,
    score: attempts.reduce((total, attempt) => total + points(attempt), 0),
    difficulty: count
      ? attempts.reduce((total, attempt) => total + attempt.difficulty, 0) / count
      : 0,
  };
}
