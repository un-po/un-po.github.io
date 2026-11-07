# Content replacement and multi-tense implementation

**Implemented:** see [results, schema, and validation](content-release.md). The original staged
plan below records the decisions leading to the replacement; source-import counts and
blockers describe the starting point, not the active corpus.

## Current state

The candidate files are organized in `docs/content-import/source/`; findings are in
[the review](content-import-review.md). They have not replaced live content. The current
app imports 100 present-tense exercises and ten complete present-tense verb tables directly
in `src/App.vue`. The candidate contains 200 unique records, of which 60 are present tense.

The supplied engine notes propose template slots, multiple targets, compound/pronominal
forms, frequency tiers, and additional tenses. They are direction, not a complete implementation
contract. In particular, all supplied sentences currently have one target, so multiple blanks
are not a prerequisite for trying this dataset.

## 1. Organization — completed

Merged the ten-record batches into four named tense partitions, renamed the three source
notes, retained IDs, and wrote an import manifest. Original downloads are backed up locally.
Only syntax repair and identical-duplicate removal changed the imported data representation.
Use the same partition names under `src/content/sentences/` when approved. Split further only
if a partition becomes difficult to review; 1,000 sentences do not require a backend.

## 2. Validation — blocked, first pass completed

Resolve corpus completeness, missing verbs, answer/grammar defects, misleading explanations,
and schema inconsistencies identified in the review. Preserve a distinction between source
metadata, reviewed answers, and reviewed paradigms. Prefer explicit full conjugations in the
shipped JSON; an offline generator may assist preparation, but must not invent runtime forms.
Automated structural checks supplement linguistic review; agreement with another generated
file is not independent evidence that a form is right.

## Expansion to 1,000 sentences

Use a hybrid approach: repair useful imported examples and regenerate defective examples
individually, then author the remaining sentences against a reviewed foundation. Replacing
every sentence in one generation pass would discard useful material without addressing the
missing paradigms, ambiguity policy, or validation problems.

1. Freeze the task contract: supported tenses, visible tense cue, one target initially,
   clitic placement, approved alternatives, and distinct curriculum/complexity metadata.
   Track the provenance and review status of each sentence outside learner-facing copy.
2. Complete the current 60 referenced verbs and check their full four-tense paradigms.
   Expand beyond these 60 verbs if the coverage plan warrants it. Avoid increasing
   the verb count solely to hit a numerical target.
3. Correct the existing 200 sentences and their explanations. Review rendered sentences
   with **every** accepted answer inserted. Check person, tense, agreement, auxiliary,
   meaning, and naturalness independently of JSON validity.
4. Draft a coverage matrix before generating the additional 800. The agreed starting allocation
   is 300 present, 300 passato prossimo, 200 imperfetto, and 200 future: this preserves the
   import's intended proportions. Include five multi-tense pilot records in this total, counting
   each once under its primary curriculum tense, not once per accepted tense. Within each partition balance persons with softened
   everyday-frequency differences, common verbs, situations, and grammatical constructions.
   This is an editorial coverage target, not session sampling weights or a calibrated curriculum.
   Replace rejected rows as needed to reach the approved total.
5. Author batches of about 50 against assigned coverage cells. Supply approved forms to
   sentence generation instead of asking it to invent conjugations. Avoid noun-swapped
   duplicates, repetitive pronoun openings, office-heavy vocabulary, and artificial anchors.
6. Gate each batch with structural/form checks and a separate linguistic review. Record
   findings and revisions by ID; require re-review after edits. Independent LLM review helps
   find defects, while fluent-speaker review of tricky constructions provides another check.
   Mere agreement between generated answers and generated verb metadata is insufficient.
7. Try an initial corrected tranche through phase 3.1 locally while the corpus expands.
   Inspect length, repetition, tone, and feedback in the actual UI. Activate additional tenses
   only with the phase 3.2 support they need. Keep unapproved rows out of production.

The completion criterion is 1,000 approved, distinct, useful exercises with complete verb
coverage, not simply 1,000 JSON records. Keep this as offline authoring/validation work; the
deployed app continues to use static files without an LLM or database API.

## 3.1. Read the replacement files with today's capabilities

Deliver a local preview after the supported subset is validated. This stage replaces the
old active exercise pool; it does not append another pool or retain old exercises as fallback.
The reduction from 100 old questions to 60 new present-tense questions must be explicit unless
additional exports arrive.

1. Add a typed content loader between JSON and the app. Parse `{slot_n}` into literal text
   and target references. Require a one-to-one slot match, unique IDs, valid references,
   reviewed answers, and complete paradigms. Ignore/remove hand-maintained `token_index`.
2. Initially activate only approved, single-target present-indicative records. Map the
   template to existing `before`/`after`, normalize person IDs and tense IDs, and supply
   six reviewed present forms for each of the 30 referenced verbs. Do not infer missing
   conjugations from sentence answers or cast incomplete JSON to `Verb[]`.
3. Keep `accepted_answers` as the complete approved list for the task. Retain the current
   grading order: exact accepted variant first, real conjugation rejection before typo
   credit. Verify table highlighting for every accepted alternative.
4. Make the capability filter explicit and report excluded partitions in development so
   an unsupported tense cannot disappear silently. Approved files can share one schema even
   when only the supported partition is active.
5. Preserve learner level, earned mastery, and existing verb/person knowledge. Use an
   explicit dataset revision and migration when schemas or contextual keys change. Retire
   removed exercise IDs without treating them as new failures; never reuse old IDs for
   different questions. Test the existing queue synchronization with a complete replacement,
   including returning learners above the candidate's available levels. Do not reset storage.
6. Replace old production imports, content assertions, and review-export assumptions. Archive
   or clearly mark old review documents as historical. Verify first visit, returning learner,
   grading, error table, history, keyboard use, narrow layouts, and build output.

No difficulty-to-level expansion is implied here. The source's difficulty 1–3 is local
complexity, not a 25-level curriculum; preserve that distinction while evaluating the data.
The present-only subset will not solve the existing progression ceiling.

## 3.2. Add the new capabilities in small increments

### A. Tense-aware single-target practice

- Separate `difficulty` from a curated `learningLevel`/unlock policy. Decide when each tense
  becomes available rather than putting all source level-1 sentences into the beginner pool.
  Test cohort exposure with the actual corpus before recalibrating mastery thresholds.
- Adopt one stable tense registry with Italian labels, canonical IDs, and capabilities.
  Agreed first scope: the four intended indicative tenses, with a visible task cue.
  Quarantine the futuro-anteriore example until supported or deliberately rewritten.
- Store paradigms by verb, tense, and person, with approved variants and separate metadata
  for pronominal forms and auxiliary behavior. Select the correct table for each exercise.
- Support multiword answers and context-bound gender agreement. Define whether clitics such
  as `ci` sit outside the slot or form part of the target; render and grade consistently.
- Expand the valid-form index across supported tenses. A wrong auxiliary, person, agreement,
  accent, or pronominal form must not earn typo credit merely because edit distance is small.
  Add regression cases derived from actual imported errors, not only synthetic strings.
- Add tense to attempt/history data where needed. Map old `presente` context records to the
  canonical tense key without losing evidence; version and test storage migrations.

### B. Five multi-tense pilot sentences

Include five single-blank sentences that each accept answers in two tenses during the first
multi-tense implementation. These are multiple valid readings of one blank, not multiple
blanks. Draft examples and their answer analyses are in
`docs/content-import/source/examples/multi-tense-pilot.json`; they are not approved or loaded by the app.

- Display the permitted pair, such as `Presente o futuro semplice`, so an otherwise valid
  answer is never rejected because of a hidden tense instruction. Keep single-tense cues
  for ordinary exercises. Admit these pilot questions after both tenses have been unlocked.
- Store approved answer analyses (text, mood, tense, person, explanation). The primary
  curriculum tense controls coverage accounting, not answer acceptance or skill credit.
  This structure must also represent ordinary single-tense answers so there is one grader.
- Match all exact approved alternatives before considering typos. On success, display the
  matching tense's feedback and table, and credit that demonstrated tense only. Store the
  match in the attempt so history reproduces the same feedback.
- For errors without a clear tense analysis, update question/verb/person context without
  guessing which tense failed or penalizing both. Wrong recognized forms can carry their
  own analysis. Define conservative typo behavior where several alternatives are equally
  close; never choose a tense arbitrarily to award skill credit.
- Cap lifetime sentence mastery at the same one point regardless of which accepted tense
  is used on subsequent attempts. Different answers must not create duplicate mastery.
- Add regression cases for every pilot answer, correct alternatives appearing second in
  the list, wrong persons, ambiguous typo candidates, history reconstruction, and repeated
  answers in different tenses. No multi-blank UI is required for this pilot.

The pilot contrasts planned-future present forms with explicit future forms, and past
background/habit readings with completed-experience readings. These choices follow
[Treccani's account of the present](https://www.treccani.it/enciclopedia/presente_%28Enciclopedia-dell%27Italiano%29/)
and its discussion of experiential and habitual uses of the
[passato prossimo](https://www.treccani.it/enciclopedia/passato-prossimo_%28Enciclopedia-dell%27Italiano%29/).
The examples are newly authored drafts, not quotations or independently approved sentences.

### C. Adaptive selection and content growth

- Keep the existing persistent queue, contextual scores, and non-farmable mastery model.
  Treat frequency tiers as reviewed metadata; their supplied numerical labels are not a
  sourced frequency study. Add a bounded frequency bias only after comparing simulations.
- Simulate 100% correct, 0% correct, all typos, one weak person/tense, small eligible pools,
  every item mastered, returning high-level learners, and pool replacement/growth. Check
  repetition gaps, starvation, migration integrity, and level-ceiling behavior.
- Adding new items must preserve queue order where applicable, earned mastery, and session
  history. Adding easier content must not retroactively penalize learners. Recalibrating a
  curriculum must not silently demote existing users or replay earned mastery.

### D. Multiple targets (later)

Implement only after single-target multi-tense practice feels right. This requires decisions
about focus/Enter behavior, partial submission, feedback/table selection, history snapshots,
and what one sentence contributes to accuracy and mastery. Recommended baseline: grade each
slot independently, derive sentence accuracy from all slots, and cap total sentence mastery
at one point so more blanks cannot inflate progression. Simulate before adopting that rule.

The five multi-tense pilot questions above bring richer answer analysis into the initial
single-target implementation. Fully open context-only tasks and multiple targets remain
separate extensions; neither is required to expand the approved corpus gradually.

## Agreed scope and remaining decisions

- Target 1,000 approved sentences with a 30/30/20/20 primary-tense distribution.
- Show a visible tense cue; pilot five single-target questions with two allowed tenses each.
- Expand content gradually after the loader and answer model support it. The pilot records
  count toward the 1,000, not in addition; their draft primary allocation is three future and
  two imperfect, leaving 300/300/198/197 ordinary exercises at the final target.
- Review curriculum unlock levels, clitic conventions, and compound-answer typo policy
  before activation. Multiple simultaneous blanks remain a later feature.

The single-target implementation and 1,000-sentence replacement are complete locally.
Multiple simultaneous blanks and frequency-weighted scheduling remain later extensions.
