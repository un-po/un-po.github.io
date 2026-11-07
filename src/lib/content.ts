import {
  normalize,
  persons,
  tenses,
  type AcceptedAnswer,
  type Exercise,
  type Person,
  type Tense,
  type Verb,
} from './practice.ts';

export const contentRevision = 'corpus-1000-v1';
export const tenseMinimumLevel: Record<Tense, number> = {
  presente: 1,
  passato_prossimo: 6,
  imperfetto: 11,
  futuro_semplice: 15,
};
export interface SentenceRecord {
  id: string;
  textTemplate: string;
  primaryTense: Tense;
  band: 1 | 2;
  level: number;
  difficulty: number;
  theme: string;
  source: string;
  target: { slotId: number; verb: string; person: Person; acceptedAnswers: AcceptedAnswer[] };
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid content: ${message}`);
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function isTense(value: unknown): value is Tense {
  return tenses.includes(value as Tense);
}
function isPerson(value: unknown): value is Person {
  return persons.includes(value as Person);
}

export function loadContent(
  rawVerbs: unknown,
  partitions: unknown[],
): { verbs: Verb[]; exercises: Exercise[] } {
  requireValue(Array.isArray(rawVerbs), 'verb database must be an array');
  const verbs: Verb[] = [];
  const verbIds = new Set<string>();
  for (const raw of rawVerbs) {
    requireValue(object(raw) && text(raw.id), 'verb requires an ID');
    requireValue(!verbIds.has(raw.id), `duplicate verb ${raw.id}`);
    verbIds.add(raw.id);
    requireValue(['are', 'ere', 'ire'].includes(String(raw.family)), `${raw.id}: family`);
    requireValue(typeof raw.irregular === 'boolean', `${raw.id}: irregular flag`);
    requireValue(
      typeof raw.reflexive === 'boolean' && ['essere', 'avere'].includes(String(raw.auxiliary)),
      `${raw.id}: auxiliary metadata`,
    );
    requireValue(
      typeof raw.tier === 'number' && [1, 2, 3].includes(raw.tier),
      `${raw.id}: frequency tier`,
    );
    requireValue(object(raw.paradigms), `${raw.id}: paradigms`);
    for (const tense of tenses) {
      const rows = raw.paradigms[tense];
      requireValue(Array.isArray(rows) && rows.length === 6, `${raw.id}: six persons for ${tense}`);
      for (const row of rows) {
        requireValue(Array.isArray(row) && row.length && row.every(text), `${raw.id}: empty form`);
        requireValue(new Set(row.map(normalize)).size === row.length, `${raw.id}: duplicate forms`);
      }
    }
    requireValue(
      object(raw.irregularTenses) &&
        tenses.every(
          (tense) => typeof (raw.irregularTenses as Record<string, unknown>)[tense] === 'boolean',
        ),
      `${raw.id}: tense-specific regularity`,
    );
    const paradigms = raw.paradigms as Record<Tense, string[][]>;
    verbs.push({
      id: raw.id,
      family: raw.family as Verb['family'],
      irregular: raw.irregular,
      irregularTenses: raw.irregularTenses as Record<Tense, boolean>,
      auxiliary: raw.auxiliary as Verb['auxiliary'],
      reflexive: raw.reflexive,
      tier: raw.tier as number,
      paradigms,
      forms: paradigms.presente.map((row) => row[0]!),
    });
  }
  const verbById = new Map(verbs.map((verb) => [verb.id, verb]));
  const ids = new Set<string>();
  const exercises: Exercise[] = [];
  for (const partition of partitions) {
    requireValue(Array.isArray(partition), 'sentence partition must be an array');
    for (const raw of partition) {
      requireValue(
        object(raw) && text(raw.id) && !ids.has(raw.id),
        'missing or duplicate sentence ID',
      );
      ids.add(raw.id);
      requireValue(text(raw.textTemplate), `${raw.id}: template`);
      requireValue(
        (raw.textTemplate.match(/\{[^}]*\}/g) ?? []).join() === '{slot_0}',
        `${raw.id}: exactly one slot_0 required`,
      );
      requireValue(isTense(raw.primaryTense), `${raw.id}: primary tense`);
      requireValue(
        Number.isInteger(raw.level) && Number(raw.level) >= 1 && Number(raw.level) <= 25,
        `${raw.id}: curriculum level`,
      );
      requireValue(
        Number.isInteger(raw.difficulty) &&
          Number(raw.difficulty) >= 1 &&
          Number(raw.difficulty) <= 5,
        `${raw.id}: difficulty`,
      );
      requireValue(text(raw.theme) && text(raw.source), `${raw.id}: provenance and theme`);
      requireValue(raw.band === 1 || raw.band === 2, `${raw.id}: band`);
      const target = raw.target;
      requireValue(
        object(target) && target.slotId === 0 && text(target.verb) && isPerson(target.person),
        `${raw.id}: target`,
      );
      const verb = verbById.get(target.verb);
      requireValue(verb, `${raw.id}: unknown verb ${target.verb}`);
      requireValue(
        Array.isArray(target.acceptedAnswers) && target.acceptedAnswers.length,
        `${raw.id}: answers`,
      );
      const analyses: AcceptedAnswer[] = [];
      for (const answer of target.acceptedAnswers) {
        requireValue(
          object(answer) &&
            text(answer.text) &&
            text(answer.explanation) &&
            isTense(answer.tense) &&
            answer.person === target.person,
          `${raw.id}: answer analysis`,
        );
        requireValue(
          verb.paradigms![answer.tense][persons.indexOf(target.person)]!.some(
            (form) => normalize(form) === normalize(answer.text as string),
          ),
          `${raw.id}: answer absent from paradigm`,
        );
        analyses.push({
          text: answer.text,
          tense: answer.tense,
          person: target.person,
          explanation: answer.explanation,
        });
      }
      requireValue(
        analyses.some((answer) => answer.tense === raw.primaryTense),
        `${raw.id}: missing primary answer`,
      );
      requireValue(
        analyses.every((answer) => Number(raw.level) >= tenseMinimumLevel[answer.tense]),
        `${raw.id}: tense before curriculum unlock`,
      );
      requireValue(
        new Set(analyses.map((answer) => normalize(answer.text))).size === analyses.length,
        `${raw.id}: ambiguous or duplicate answer analysis`,
      );
      const [before, after] = raw.textTemplate.split('{slot_0}');
      exercises.push({
        id: raw.id,
        verb: target.verb,
        person: target.person,
        before: before!,
        after: after!,
        answers: analyses.map((answer) => answer.text),
        acceptedAnswers: analyses,
        explanation: analyses[0]!.explanation,
        difficulty: raw.difficulty as number,
        band: raw.band as 1 | 2,
        level: raw.level as number,
        tense: raw.primaryTense,
      });
    }
  }
  requireValue(exercises.length, 'empty exercise pool');
  return { verbs, exercises };
}
