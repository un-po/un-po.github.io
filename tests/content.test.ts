import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../src/lib/content.ts';
import {
  answerAnalyses,
  gradeAnswer,
  gradeExercise,
  persons,
  tenses,
} from '../src/lib/practice.ts';
import { createLearningState, recordLearningOutcome } from '../src/lib/learning.ts';
import { exercises, verbs, partitions, rawVerbs } from './content-fixture.ts';

test('replacement corpus has the agreed coverage, unique templates, and five mixed-tense tasks', () => {
  assert.equal(exercises.length, 1000);
  assert.equal(verbs.length, 60);
  assert.deepEqual(
    tenses.map((tense) => exercises.filter((e) => e.tense === tense).length),
    [300, 300, 200, 200],
  );
  assert.equal(
    new Set(exercises.map((e) => `${e.before}{slot}${e.after}`.toLocaleLowerCase('it'))).size,
    1000,
  );
  assert.equal(
    exercises.filter((e) => new Set(answerAnalyses(e).map((a) => a.tense)).size > 1).length,
    5,
  );
  for (const tense of tenses) {
    for (const person of persons)
      assert.ok(exercises.some((e) => e.tense === tense && e.person === person));
  }
});

test('loader rejects incomplete paradigms, broken slots, duplicate IDs, and invented answers', () => {
  const badVerbs = structuredClone(rawVerbs);
  badVerbs[0].paradigms.imperfetto.pop();
  assert.throws(() => loadContent(badVerbs, partitions), /six persons/);
  for (const mutate of [
    (rows: any[]) => {
      rows[0].textTemplate += ' {slot_1}';
    },
    (rows: any[]) => {
      rows[0].id = rows[1].id;
    },
    (rows: any[]) => {
      rows[0].target.acceptedAnswers[0].text = 'inventato';
    },
    (rows: any[]) => {
      rows[0].target.acceptedAnswers[0].person = 'nobody';
    },
  ]) {
    const rows = structuredClone(partitions[0]);
    mutate(rows);
    assert.throws(() => loadContent(rawVerbs, [rows]), /Invalid content/);
  }
});

test('independent conjugation fixtures cover irregular stems, spelling, auxiliaries and clitics', () => {
  const cases = [
    ['bere', 'imperfetto', 0, 'bevevo'],
    ['fare', 'imperfetto', 3, 'facevamo'],
    ['dire', 'imperfetto', 4, 'dicevate'],
    ['essere', 'imperfetto', 5, 'erano'],
    ['avere', 'imperfetto', 1, 'avevi'],
    ['giocare', 'presente', 3, 'giochiamo'],
    ['mangiare', 'presente', 3, 'mangiamo'],
    ['capire', 'presente', 3, 'capiamo'],
    ['capire', 'presente', 5, 'capiscono'],
    ['uscire', 'presente', 0, 'esco'],
    ['venire', 'presente', 5, 'vengono'],
    ['dovere', 'presente', 0, 'debbo'],
    ['giocare', 'futuro_semplice', 0, 'giocherò'],
    ['mangiare', 'futuro_semplice', 3, 'mangeremo'],
    ['viaggiare', 'futuro_semplice', 4, 'viaggerete'],
    ['bere', 'futuro_semplice', 0, 'berrò'],
    ['venire', 'futuro_semplice', 1, 'verrai'],
    ['godersi', 'futuro_semplice', 1, 'ti godrai'],
    ['godersi', 'futuro_semplice', 1, 'ti goderai'],
    ['aprire', 'passato_prossimo', 0, 'ho aperto'],
    ['rispondere', 'passato_prossimo', 1, 'hai risposto'],
    ['perdersi', 'passato_prossimo', 3, 'ci siamo persi'],
    ['alzarsi', 'passato_prossimo', 4, 'vi siete alzate'],
    ['andare', 'passato_prossimo', 2, 'è andata'],
    ['vedere', 'passato_prossimo', 5, 'hanno veduto'],
  ] as const;
  for (const [id, tense, person, form] of cases) {
    assert.ok(
      verbs.find((v) => v.id === id)!.paradigms![tense][person]!.includes(form),
      `${id}: ${form}`,
    );
  }
});

test('import corrections reject wrong person and gender and preserve existential slots', () => {
  const byId = (id: string) => exercises.find((e) => e.id === id)!;
  assert.equal(gradeExercise('devono', byId('presente-0012'), verbs).outcome, 'error');
  assert.equal(
    gradeExercise('si sono alzate', byId('passato_prossimo-0004'), verbs).outcome,
    'error',
  );
  assert.equal(
    gradeExercise('sono tornate', byId('passato_prossimo-0059'), verbs).outcome,
    'error',
  );
  assert.equal(gradeExercise('godrai', byId('futuro_semplice-0035'), verbs).outcome, 'error');
  assert.equal(byId('futuro_semplice-0021').person, 'loro');
  assert.equal(byId('futuro_semplice-0021').after, '?');
  assert.ok(byId('imperfetto-0032').before.endsWith("c'"));
  assert.deepEqual(byId('imperfetto-0032').answers, ['era']);
  assert.equal(byId('futuro_semplice-0025').verb, 'essere');
});

test('each mixed-tense alternative returns its own analysis, regardless of answer order', () => {
  const mixed = exercises.filter((e) => new Set(answerAnalyses(e).map((a) => a.tense)).size > 1);
  assert.equal(mixed.length, 5);
  for (const exercise of mixed) {
    for (const answer of answerAnalyses(exercise)) {
      const result = gradeExercise(`  ${answer.text.toUpperCase()}  `, exercise, verbs);
      assert.equal(result.outcome, 'correct');
      assert.deepEqual(result.matched, answer);
    }
  }
});

test('past stare accepts both subject genders with an invariant sentence suffix', () => {
  const exercise = exercises.find((e) => e.id === 'passato_prossimo-0263')!;
  assert.deepEqual(exercise.answers, ['siamo stati', 'siamo state']);
  assert.equal(exercise.after, ' in silenzio per ascoltare il canto degli uccelli.');
  for (const answer of exercise.answers) {
    assert.equal(gradeExercise(answer, exercise, verbs).outcome, 'correct');
  }
});

test('compound grammar errors and ambiguous approximations do not earn typo credit', () => {
  for (const [answer, accepted] of [
    ['ha mangiato', ['ho mangiato']],
    ['ho mangiata', ['ho mangiato']],
    ['o mangiato', ['ho mangiato']],
    ['sono andati', ['sono andato', 'sono andata']],
    ['e andata', ['è andata']],
    ['ti sei alzato', ['mi sono alzato']],
    ['sono andatx', ['sono andato', 'sono andata']],
    ['lavoremo', ['lavoreremo', 'lavoriamo']],
    ['parlerei', ['parlerai']],
    ['dorma', ['dormo']],
  ] as Array<[string, string[]]>)
    assert.equal(gradeAnswer(answer, accepted, verbs), 'error', answer);
  assert.equal(gradeAnswer('ho mangaito', ['ho mangiato'], verbs), 'error'); // two edits
  assert.equal(gradeAnswer('ho mangito', ['ho mangiato'], verbs), 'typo');
  assert.equal(gradeAnswer('lavoreró', ['lavorerò'], verbs), 'error');
});

test('alternative tenses replace the question result and update only their own evidence', () => {
  const exercise = exercises.find((e) => e.id === 'imperfetto-0199')!;
  const state = createLearningState(exercises, () => 0.5);
  recordLearningOutcome(state, exercise, 'correct', exercises, () => 0.5, 'passato_prossimo');
  assert.equal(state.contexts.tenses.passato_prossimo?.correct, 1);
  assert.equal('imperfetto' in state.contexts.tenses, false);
  recordLearningOutcome(state, exercise, 'correct', exercises, () => 0.5, 'imperfetto');
  assert.equal(state.contexts.tenses.imperfetto?.correct, 1);
  assert.equal(Object.keys(state.results).length, 1);
  assert.equal(state.results[exercise.id]?.tense, 'imperfetto');
  recordLearningOutcome(state, exercise, 'error', exercises, () => 0.5, null);
  assert.equal(state.contexts.questions[exercise.id]?.errors, 1);
  assert.equal(state.contexts.tenses.imperfetto?.errors, 0);
  assert.equal(state.contexts.tenses.passato_prossimo?.errors, 0);
});
