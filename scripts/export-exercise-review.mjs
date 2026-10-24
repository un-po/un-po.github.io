import { readFileSync, writeFileSync } from 'node:fs';
import prettier from 'prettier';

const contentDirectory = new URL('../src/content/', import.meta.url);
const outputPath = new URL('../docs/exercise-review.md', import.meta.url);
const exercises = [
  ...JSON.parse(readFileSync(new URL('exercises.json', contentDirectory), 'utf8')),
  ...JSON.parse(readFileSync(new URL('exercises-pilot.json', contentDirectory), 'utf8')),
];
const verbs = JSON.parse(readFileSync(new URL('verbs.json', contentDirectory), 'utf8'));
const persons = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];
const personCounts = Object.fromEntries(persons.map((person) => [person, 0]));
const verbCounts = new Map();

const exerciseSections = exercises
  .map((exercise) => {
    personCounts[exercise.person] += 1;
    verbCounts.set(exercise.verb, (verbCounts.get(exercise.verb) ?? 0) + 1);
    return `### ${exercise.id} — ${exercise.verb} · ${exercise.person} · difficulty ${exercise.difficulty}

${exercise.before} **___** ${exercise.after}

- Accepted answer${exercise.answers.length === 1 ? '' : 's'}: ${exercise.answers.map((answer) => `\`${answer}\``).join(', ')}
- Explanation: ${exercise.explanation}`;
  })
  .join('\n\n');

const families = verbs.reduce((counts, verb) => {
  counts[verb.family] = (counts[verb.family] ?? 0) + 1;
  return counts;
}, {});
const irregularVerbs = verbs.filter((verb) => verb.irregular).map((verb) => `\`${verb.id}\``);
const personSummary = persons.map((person) => `${person}: ${personCounts[person]}`).join(', ');
const verbSummary = [...verbCounts].map(([verb, count]) => `\`${verb}\` (${count})`).join(', ');

const markdown = `# Exercise review sheet

Generated from src/content/exercises.json, src/content/exercises-pilot.json, and src/content/verbs.json by node scripts/export-exercise-review.mjs.

This is an LLM- and human-readable review copy; the JSON files remain the source of truth. The pilot additions are generated drafts and need careful review before being treated as approved Italian.

## Review brief

For each sentence, assess:

1. Is it grammatical and natural in contemporary Italian?
2. Does the context make the intended person and verb form clear without revealing the person as a separate hint?
3. Are all natural answers listed? Flag sentences where another conjugation could reasonably fit.
4. Is the explanation correct, concise, and helpful to a beginner?
5. Suggest a rewrite only when needed; preserve the target verb, person, and learning point. Mark regional or register-specific wording.

Do not treat the stated person as proof that the sentence is unambiguous. Explain uncertainty and avoid inventing grammar rules. Confirm suggested corrections with a fluent speaker before merging.

## Exercises (${exercises.length})

Difficulty is the current internal value from 1 (easier) to 5 (harder).

${exerciseSections}

## Corpus snapshot

- ${exercises.length} exercises across ${verbs.length} verbs; present indicative only.
- Person counts: ${personSummary}.
- Verb groups: ${Object.entries(families)
  .map(([family, count]) => `${count} -${family}`)
  .join(', ')} verbs.
- Currently classified as irregular: ${irregularVerbs.join(', ')}.
- Exercises per verb: ${verbSummary}.
- Every exercise currently has ${Math.max(...exercises.map((exercise) => exercise.answers.length)) === 1 ? 'one accepted answer' : 'one or more accepted answers'}.

## Provenance for future additions

The pilot additions were written as original practice sentences from everyday situations. For future additions, keep a source note for factual prompts and record the author and license for any borrowed wording. Publicly viewable news and company marketing copy is still copyrighted; changing names or nouns does not by itself make copied phrasing reusable.

[Tatoeba's downloadable sentence corpus](https://en.www.en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus) is distributed under CC BY 2.0 FR and requires attribution. Reuse would need per-sentence provenance and a licensing review against this project's CC BY 4.0 content license. [Project Gutenberg](https://www.gutenberg.org/policy/permission.html) is a possible source for older prose, but its collection is cleared under US copyright rules and rights may differ by country. Check each individual work before adapting or redistributing it.
`;

writeFileSync(outputPath, await prettier.format(markdown, { parser: 'markdown' }));
console.log(`Wrote ${exercises.length} exercise entries to docs/exercise-review.md`);
