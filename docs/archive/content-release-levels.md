# Four-tense corpus and practice implementation

## Shipped locally

The old 100-question present-only corpus has been replaced by 1,000 distinct sentence
templates across 60 verbs. Counts are **300 present, 300 passato prossimo, 200 imperfetto,
200 future**. Five single-blank questions accept two tenses and count once under their primary
curriculum tense. Three are present/future pairs and two are imperfect/past pairs.

The 200 imported sentences were revised, including wrong accepted answers, gender agreement,
missing prepositions, awkward wording, clitic placement, and erroneous explanations. The
misidentified futuro-anteriore target was replaced with an essere task under a new ID,
`sent-fut-125-v2`. Another 795 sentences and the five pilot questions were authored individually.
The original supplied material and import manifest are preserved in `content-import/source/`;
older live-content reviews are in `archive/`.

## Content contract

- `src/content/verbs.json` contains 60 explicit four-tense, six-person paradigms. Each cell
  permits one or more reviewed morphological variants. The stored `forms` field mirrors
  the preferred present forms; the loader derives its runtime equivalent from the paradigm.
- `src/content/sentences/*.json` holds stable IDs, a template with exactly one `{slot_0}`,
  a primary tense, curriculum level, linguistic difficulty, theme, provenance, and target.
- Each accepted answer has `text`, `tense`, `person`, and its own `explanation`. Cues are
  derived from those tenses. Gender variants are restricted by explicit subjects. Some
  existential prompts put `c'` or `ci` outside the slot; literal template spacing is preserved.
- The loader validates references, slot count, IDs, person/tense values, and every accepted
  answer against the corresponding paradigm. It rejects malformed content instead of
  silently omitting it. Multiple blanks remain deliberately unsupported.
- Standard alternatives such as visto/veduto and devo/debbo are retained. Regional and
  archaic paradigms are outside this corpus's scope. Default auxiliaries apply to the supplied
  constructions; metadata is not used to invent or override accepted answers at runtime.

## Interaction and grading

A restrained tense cue appears above the sentence. Compound answers have a wider field that
shrinks its font for longer forms on narrow screens. All exact accepted alternatives are
checked first. Valid forms of another person or tense are errors, as are accent-only changes.
Compound typo credit protects auxiliary/clitic tokens and agreement endings; equally close
alternative answers receive no speculative typo credit.

Matching answers retain their analysis in session history. Mixed-tense success shows the
matching explanation and updates the demonstrated tense's context only. Unknown mixed-task
errors update question, verb, and person contexts without guessing a failed tense. Correction
tables use the displayed answer's tense and restrict the target row to the sentence's valid
forms; other rows show the full paradigm. Alternative valid answers are also listed.

Mastery remains capped at one point per sentence, regardless of which answer is used. No new
analytics events or learner-data transfers were introduced.

## Curriculum and storage

Content levels are separate from linguistic complexity: present 1–5, passato prossimo 6–10,
imperfect 11–14, and future 15–19. Within each band, irregular/pronominal patterns begin later;
individual examples are distributed across the remaining band. These are initial practice
bands, not CEFR proficiency claims. The existing one-level lookahead introduces new tenses at
learner levels 5, 10, and 14. Mixed tasks appear only when both constituent tenses are available.
The existing four-level retention window and unseen-question carryover remain in effect.

Storage version 2 adds the content revision. A validated version-1 migration preserves learner
level, mastery totals, missed mastery, and contextual records. Removed old exercise IDs leave
the queue and their mastery records become `removed`; new eligible IDs are added. Repeated
loads do not award mastery or reset progress. Existing levels above the corpus cap remain intact.

The new maximum reachable level is 23 (highest question level 19 + four). The rank thresholds
and mastery targets are unchanged. In particular, this retains the prior policy that sufficient
typo credit can eventually reach the content cap; level alone is not proof of accuracy.
Frequency tiers are metadata, not new queue weights; calibrating frequency bias remains later work.

## Validation and linguistic review scope

Automated checks cover all 1,000 templates and answer/paradigm references, independently written
conjugation fixtures, the specific imported defects, mixed-answer attribution, conservative
typos, storage migration, and desktop/mobile interaction. The complete text was authored or
editorially revised by the coding assistant; this is not independent fluent-speaker approval.
Structural agreement cannot prove that a sentence is natural. `npm run content:review` produces
four sentence review sheets and a separate verb-table sheet in ignored `.local/content-review/`
for an independent reader or model. JSON remains the source of truth.

Linguistic reference checks included [uscire](https://www.treccani.it/vocabolario/uscire/),
[dovere](https://www.treccani.it/enciclopedia/dovere_%28La-grammatica-italiana%29/),
[vedere](https://www.treccani.it/vocabolario/vedere/),
[spegnere](https://www.treccani.it/vocabolario/spegnere/), and
[godere](https://www.treccani.it/vocabolario/godere/). No source sentences were copied.

Deterministic simulations on the actual corpus (5,000 attempts per scenario) produced:

| Scenario                               | Level | Mastery |    Distinct questions seen |
| -------------------------------------- | ----: | ------: | -------------------------: |
| All correct                            |    23 |   1,000 |                      1,000 |
| All incorrect                          |     1 |       0 | All 100 currently eligible |
| All typos                              |    23 |     400 |                      1,000 |
| All passato prossimo answers incorrect |    23 |     700 |                      1,000 |

Expansion from the present-only partition also preserves progress and unlocks the remaining
pool. A pre-existing level-25 learner continues practicing without demotion or an empty queue.
The synthetic 500-item stress suite remains in place for continuity with the previous model.
