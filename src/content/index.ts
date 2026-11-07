import rawVerbs from './verbs.json';
import present from './sentences/presente.json';
import past from './sentences/passato_prossimo.json';
import imperfect from './sentences/imperfetto.json';
import future from './sentences/futuro_semplice.json';
import { loadContent } from '../lib/content.ts';

export const { verbs, exercises } = loadContent(rawVerbs, [present, past, imperfect, future]);
