import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Historical source audit: intentionally reports the defects in the original import.
// The live replacement corpus is validated by npm test.
const root = fileURLToPath(new URL('../docs/content-import/source/', import.meta.url));
const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const errors = [];
const warnings = [];
const counts = { sentences: 0, targets: 0, verbs: 0, partitions: {}, levels: {}, persons: {} };
const increment = (map, key) => (map[key] = (map[key] ?? 0) + 1);
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const expectedTenses = {
  'indicativo-presente.json': 'indicativo_presente',
  'passato-prossimo.json': 'indicativo_passato_prossimo',
  'imperfetto.json': 'imperfetto',
  'futuro-semplice.json': 'futuro_semplice',
};
const persons = ['io', 'tu', 'lui_lei', 'noi', 'voi', 'loro'];
const verbIds = new Set();
const usedVerbs = new Set();
const missingVerbs = new Map();
const sentenceIds = new Set();
const templates = new Map();
const tokenMismatches = { zeroBased: [], oneBased: [] };

try {
  const database = readJson('verbs.json');
  if (!Array.isArray(database.verbi)) throw new Error('verbs.json must contain a verbi array');
  counts.verbs = database.verbi.length;
  for (const verb of database.verbi) {
    check(nonempty(verb.infinito), 'A verb has no infinitive');
    check(!verbIds.has(verb.infinito), `Duplicate verb: ${verb.infinito}`);
    verbIds.add(verb.infinito);
    check(
      ['1', '2', '3', 'ausiliare', 'riflessivo'].includes(verb.coniugazione),
      `${verb.infinito}: invalid conjugation class`,
    );
    check([1, 2, 3].includes(verb.tier), `${verb.infinito}: invalid frequency tier`);
    check(
      ['essere', 'avere'].includes(verb.ausiliare),
      `${verb.infinito}: invalid default auxiliary`,
    );
    check(typeof verb.irregolare === 'boolean', `${verb.infinito}: missing irregular flag`);
  }

  for (const file of readdirSync(path.join(root, 'sentences'))
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const rows = readJson(`sentences/${file}`);
    if (!Array.isArray(rows)) throw new Error(`${file} must contain an array`);
    check(file in expectedTenses, `Unrecognized partition: ${file}`);
    counts.partitions[file] = rows.length;
    for (const row of rows) {
      counts.sentences += 1;
      check(
        nonempty(row.id) && !sentenceIds.has(row.id),
        `Invalid or duplicate sentence ID: ${row.id}`,
      );
      sentenceIds.add(row.id);
      for (const field of ['context_theme', 'text_template', 'constraint_type']) {
        check(nonempty(row[field]), `${row.id}: missing ${field}`);
      }
      check(
        Number.isInteger(row.difficulty_level) &&
          row.difficulty_level >= 1 &&
          row.difficulty_level <= 25,
        `${row.id}: invalid difficulty`,
      );
      increment(counts.levels, row.difficulty_level);
      if (!nonempty(row.text_template) || !Array.isArray(row.targets) || !row.targets.length) {
        errors.push(`${row.id}: needs a template and targets`);
        continue;
      }
      const normalizedTemplate = row.text_template.normalize('NFC').trim().replace(/\s+/g, ' ');
      if (templates.has(normalizedTemplate))
        warnings.push(`${row.id}: same template as ${templates.get(normalizedTemplate)}`);
      templates.set(normalizedTemplate, row.id);
      const placeholders = [...row.text_template.matchAll(/\{slot_(\d+)\}/g)].map((match) =>
        Number(match[1]),
      );
      const slots = row.targets.map((target) => target.slot_id);
      check(new Set(slots).size === slots.length, `${row.id}: duplicate target slots`);
      check(
        placeholders.length === slots.length &&
          slots.every((slot) => placeholders.filter((value) => value === slot).length === 1),
        `${row.id}: placeholders and targets differ`,
      );
      for (const target of row.targets) {
        counts.targets += 1;
        increment(counts.persons, target.person);
        usedVerbs.add(target.verb);
        if (!verbIds.has(target.verb)) {
          if (!missingVerbs.has(target.verb)) missingVerbs.set(target.verb, []);
          missingVerbs.get(target.verb).push(row.id);
        }
        check(
          Number.isInteger(target.slot_id) && target.slot_id >= 0,
          `${row.id}: invalid slot ID`,
        );
        check(target.mood === 'indicativo', `${row.id}: unsupported mood`);
        check(target.tense === expectedTenses[file], `${row.id}: tense differs from partition`);
        check(persons.includes(target.person), `${row.id}: invalid person`);
        check(nonempty(target.explanation), `${row.id}: missing explanation`);
        const answers = target.accepted_answers;
        check(
          Array.isArray(answers) && answers.length > 0 && answers.every(nonempty),
          `${row.id}: invalid accepted answers`,
        );
        if (Array.isArray(answers) && answers.every(nonempty)) {
          const normalized = answers.map((answer) =>
            answer.normalize('NFC').trim().toLocaleLowerCase('it').replace(/\s+/g, ' '),
          );
          check(
            new Set(normalized).size === answers.length,
            `${row.id}: duplicate normalized answers`,
          );
        }
        check(
          Number.isInteger(target.token_index) && target.token_index >= 0,
          `${row.id}: invalid token index`,
        );
        const index = row.text_template
          .split(/\s+/)
          .findIndex((word) => word.includes(`{slot_${target.slot_id}}`));
        if (target.token_index !== index) tokenMismatches.zeroBased.push(row.id);
        if (target.token_index !== index + 1) tokenMismatches.oneBased.push(row.id);
      }
    }
  }
  for (const [verb, ids] of [...missingVerbs].sort())
    errors.push(`Missing verb ${verb}: ${ids.join(', ')}`);
  if (tokenMismatches.zeroBased.length && tokenMismatches.oneBased.length) {
    warnings.push(
      `token_index disagrees with whitespace tokenization for ${tokenMismatches.zeroBased.length} targets at base 0 and ${tokenMismatches.oneBased.length} at base 1. No tokenizer is specified; use slot placeholders.`,
    );
  }
  warnings.push(
    'Verb entries contain metadata, not complete reviewed conjugation tables. Answer correctness and naturalness require linguistic review.',
  );
} catch (error) {
  errors.push(error.message);
}

console.log(
  JSON.stringify(
    {
      status: errors.length ? 'blocked' : 'structural-checks-passed-language-review-still-required',
      counts,
      referencedVerbs: usedVerbs.size,
      missingVerbs: [...missingVerbs.keys()].sort(),
      unusedVerbs: [...verbIds].filter((verb) => !usedVerbs.has(verb)).sort(),
      errors,
      warnings,
    },
    null,
    2,
  ),
);
process.exitCode = errors.length ? 1 : 0;
