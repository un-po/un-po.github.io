import { readFileSync } from 'node:fs';
import { loadContent } from '../src/lib/content.ts';
import { tenses } from '../src/lib/practice.ts';

export const rawVerbs = JSON.parse(
  readFileSync(new URL('../src/content/verbs.json', import.meta.url), 'utf8'),
);
export const partitions = tenses.map((tense) =>
  JSON.parse(
    readFileSync(new URL(`../src/content/sentences/${tense}.json`, import.meta.url), 'utf8'),
  ),
);
export const { verbs, exercises } = loadContent(rawVerbs, partitions);
