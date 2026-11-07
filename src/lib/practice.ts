export type Outcome = 'correct' | 'typo' | 'error';
export type Person = 'io' | 'tu' | 'lui/lei' | 'noi' | 'voi' | 'loro';
export const persons: Person[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];
export const tenseLabels = {
  presente: 'Presente indicativo',
  passato_prossimo: 'Passato prossimo',
  imperfetto: 'Imperfetto',
  futuro_semplice: 'Futuro semplice',
} as const;
export type Tense = keyof typeof tenseLabels;
export const tenses = Object.keys(tenseLabels) as Tense[];
export interface AcceptedAnswer {
  text: string;
  tense: Tense;
  person: Person;
  explanation: string;
}
export interface Verb {
  id: string;
  family: 'are' | 'ere' | 'ire';
  irregular: boolean;
  irregularTenses?: Record<Tense, boolean>;
  forms: string[];
  paradigms?: Record<Tense, string[][]>;
  auxiliary?: 'essere' | 'avere';
  reflexive?: boolean;
  tier?: number;
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
  band?: 1 | 2;
  level?: number;
  tense?: string;
  acceptedAnswers?: AcceptedAnswer[];
}
export interface Attempt {
  exerciseId: string;
  verb: string;
  person: Person;
  answer: string;
  outcome: Outcome;
  difficulty: number;
  timestamp: number;
  tense?: Tense;
  matchedAnswer?: string;
}
export function normalize(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLocaleLowerCase('it')
    .replace(/\s+/g, ' ');
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
const formIndexes = new WeakMap<Verb[], Set<string>>();
function knownForms(verbs: Verb[]): Set<string> {
  let forms = formIndexes.get(verbs);
  if (!forms) {
    forms = new Set(
      verbs
        .flatMap((verb) => [...verb.forms, ...Object.values(verb.paradigms ?? {}).flat(2)])
        .map(normalize),
    );
    formIndexes.set(verbs, forms);
  }
  return forms;
}
function probableTypo(value: string, target: string, forms: Set<string>): boolean {
  if (value.length < 5 || target.length < 5 || editDistance(value, target) !== 1) return false;
  const supplied = value.split(' ');
  const expected = target.split(' ');
  if (supplied.length !== expected.length) return false;
  // In compound forms, protect auxiliaries, clitics, accents, and agreement endings.
  for (let index = 0; index < expected.length; index++) {
    const a = supplied[index]!;
    const b = expected[index]!;
    if (a === b) continue;
    if (withoutAccents(a) === withoutAccents(b) || forms.has(a)) return false;
    // Near-matching endings may be another mood (e.g. parlerai/parlerei), not a typo.
    let prefix = 0;
    while (prefix < Math.min(a.length, b.length) && a[prefix] === b[prefix]) prefix++;
    if (prefix >= b.length - 2) return false;
    if (expected.length > 1 && (index < expected.length - 1 || a.at(-1) !== b.at(-1))) return false;
  }
  return true;
}
export function gradeAnswer(answer: string, accepted: string[], verbs: Verb[]): Outcome {
  const value = normalize(answer);
  const targets = accepted.map(normalize);
  if (targets.includes(value)) return 'correct';
  // A real conjugation, even one letter away, is a grammatical error.
  const forms = knownForms(verbs);
  if (forms.has(value)) return 'error';
  if (targets.some((target) => withoutAccents(target) === withoutAccents(value))) return 'error';
  if (new Set(targets.filter((target) => probableTypo(value, target, forms))).size === 1)
    return 'typo';
  return 'error';
}
export function answerAnalyses(exercise: Exercise): AcceptedAnswer[] {
  return (
    exercise.acceptedAnswers ??
    exercise.answers.map((text) => ({
      text,
      tense: (exercise.tense ?? 'presente') as Tense,
      person: exercise.person,
      explanation: exercise.explanation,
    }))
  );
}
export function gradeExercise(answer: string, exercise: Exercise, verbs: Verb[]) {
  const analyses = answerAnalyses(exercise);
  const value = normalize(answer);
  const outcome = gradeAnswer(
    answer,
    analyses.map((item) => item.text),
    verbs,
  );
  const matches = analyses.filter((item) =>
    outcome === 'correct'
      ? normalize(item.text) === value
      : outcome === 'typo' && probableTypo(value, normalize(item.text), knownForms(verbs)),
  );
  return { outcome, matched: matches.length === 1 ? matches[0] : undefined };
}
export function exerciseTenseCue(exercise: Exercise): string {
  return [...new Set(answerAnalyses(exercise).map((answer) => answer.tense))]
    .map((tense) => tenseLabels[tense])
    .join(' o ');
}
export function summarize(attempts: Attempt[]) {
  const count = attempts.length;
  return {
    count,
    accuracy: count
      ? Math.round((attempts.filter((a) => a.outcome === 'correct').length / count) * 100)
      : 0,
    typos: attempts.filter((a) => a.outcome === 'typo').length,
    difficulty: count
      ? attempts.reduce((total, attempt) => total + attempt.difficulty, 0) / count
      : 0,
  };
}
