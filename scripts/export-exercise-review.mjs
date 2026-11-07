import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import prettier from 'prettier';
import { loadContent } from '../src/lib/content.ts';
import { persons, tenses, tenseLabels } from '../src/lib/practice.ts';

const contentDirectory = new URL('../src/content/', import.meta.url);
const outputDirectory = new URL('../.local/content-review/', import.meta.url);
const { verbs, exercises } = loadContent(
  JSON.parse(readFileSync(new URL('verbs.json', contentDirectory), 'utf8')),
  tenses.map((tense) =>
    JSON.parse(readFileSync(new URL(`sentences/${tense}.json`, contentDirectory), 'utf8')),
  ),
);
mkdirSync(outputDirectory, { recursive: true });
const brief = `These are original practice sentences, including revised imported material. Review each
complete sentence with every accepted answer inserted. Check naturalness, verb/person/tense,
auxiliary, agreement, clitics, and the explanation. The learner sees the permitted tense(s),
so judge alternatives within that instruction. Report findings by stable ID. Distinguish errors
from optional stylistic edits. Do not assume matching JSON files prove linguistic correctness.
`;
for (const tense of tenses) {
  const rows = exercises.filter((exercise) => exercise.tense === tense);
  const sections = rows
    .map(
      (exercise) => `### ${exercise.id} — ${exercise.verb} · ${exercise.person}

Level ${exercise.level}; complexity ${exercise.difficulty}.

${exercise.before}**___**${exercise.after}

${exercise.acceptedAnswers.map((answer) => `- **${answer.text}** (${tenseLabels[answer.tense]}): ${answer.explanation}\n  - Rendered: ${exercise.before}${answer.text}${exercise.after}`).join('\n')}`,
    )
    .join('\n\n');
  writeFileSync(
    new URL(`${tense}.md`, outputDirectory),
    await prettier.format(
      `# ${tenseLabels[tense]} — ${rows.length} sentences\n\n${brief}\n${sections}\n`,
      { parser: 'markdown' },
    ),
  );
}
const tables = verbs
  .map(
    (verb) => `## ${verb.id}

Default auxiliary: ${verb.auxiliary}; pronominal: ${verb.reflexive}; tier: ${verb.tier}.
Auxiliary choice is scoped to the supplied uses; it is not a universal rule for every construction.

| Person | ${tenses.map((tense) => tenseLabels[tense]).join(' | ')} |
| --- | --- | --- | --- | --- |
${persons.map((person, index) => `| ${person} | ${tenses.map((tense) => verb.paradigms[tense][index].join(' / ')).join(' | ')} |`).join('\n')}`,
  )
  .join('\n\n');
writeFileSync(
  new URL('verbs.md', outputDirectory),
  await prettier.format(`# Verb paradigms\n\n${tables}\n`, { parser: 'markdown' }),
);
console.log(
  `Exported ${exercises.length} sentences in four tense review sheets and ${verbs.length} verb tables to .local/content-review/`,
);
