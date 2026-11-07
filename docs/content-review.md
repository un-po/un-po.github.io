# Focused content review

The coding assistant reviewed all 1,000 templates with their 1,060 accepted answers, all
explanations, and 60 four-tense verb tables (1,440 person/tense cells). This is a focused
editorial review, not independent fluent-speaker certification. Review exports can be
regenerated with `npm run content:review`; production JSON remains authoritative.

## Corrections

The following 21 templates were revised. Accepted forms, verb/person targets, explanations,
difficulty metadata, bands, partition sizes, and progression rules were preserved.

| Current ID            | Former review ID            | Correction                                                                                                                    |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| passato_prossimo-0263 | corpus-passato_prossimo-203 | Replace gender-dependent `attenti` with an invariant silence/listening context; both `siamo stati` and `siamo state` now fit. |
| passato_prossimo-0116 | corpus-passato_prossimo-056 | Replace accident victims with volunteers tending a garden.                                                                    |
| presente-0037         | sent-pres-137               | Replace criticism of excessive computer work with a library project.                                                          |
| passato_prossimo-0171 | corpus-passato_prossimo-111 | Replace criticism of inviting too many people with inviting neighbors.                                                        |
| imperfetto-0085       | corpus-imperfetto-045       | Replace a bleak prediction about an empty village with its lively square.                                                     |
| passato_prossimo-0067 | corpus-passato_prossimo-007 | Replace potentially bereavement-related wording with a grandfather enjoying a particular trip.                                |
| passato_prossimo-0068 | corpus-passato_prossimo-008 | Replace potentially lost-pet wording with enjoying a trip.                                                                    |
| imperfetto-0193       | corpus-imperfetto-153       | Replace the marriage/travel contrast with a photography job.                                                                  |
| futuro_semplice-0032  | sent-fut-132                | Replace guaranteed exam success with passing a bridge on a walk.                                                              |
| imperfetto-0078       | corpus-imperfetto-038       | Clarify `era via` as `era in viaggio`; the original meant away, not alive.                                                    |
| presente-0275         | corpus-presente-215         | Replace `quando finisce la folla` with `quando c'è meno gente`.                                                               |
| presente-0230         | corpus-presente-170         | Simplify pointing to a route on a map.                                                                                        |
| passato_prossimo-0292 | corpus-passato_prossimo-232 | Replace awkward placement of `mai` with `almeno una volta`, keeping the entire compound verb in the blank.                    |
| presente-0016         | sent-pres-116               | Simplify an administrative proposal question.                                                                                 |
| presente-0022         | sent-pres-122               | Use more natural placement of `tu` in a wellbeing question.                                                                   |
| presente-0035         | sent-pres-135               | Remove redundant workplace wording from the language example.                                                                 |
| presente-0057         | sent-pres-157               | Give switching off terrace lights a clearer bedtime context.                                                                  |
| passato_prossimo-0046 | sent-past-146               | Simplify the forgotten-keys location.                                                                                         |
| futuro_semplice-0013  | sent-fut-113                | Specify finishing the preparation of documents.                                                                               |
| futuro_semplice-0008  | sent-fut-108                | Provide a clearer meeting context for the future assertion.                                                                   |
| imperfetto-0027       | sent-imp-127                | Use conversational subject order and passato prossimo around the imperfect blank.                                             |

Prefer pleasant, nonjudgmental contexts. Avoid explicit trauma, implied bereavement,
humiliation, and unnecessary stereotypes. Lightly unfortunate or funny situations are welcome;
a forgotten gate or too many guests need not be treated as criticism of the learner.
Successful responses to trouble, such as firefighters putting out a fire, can remain.
Ordinary inconveniences, weather, and neutral healthcare references can remain. Check every accepted alternative
inside the full sentence: a correct verb-table form can still disagree with an adjective
outside the blank. Explicit subject cues remain useful for fair person identification.

After discussion, the original forgotten-gate (`presente-0120`) and firefighting
(`presente-0260`) sentences were restored. The silence/listening replacement remains because
the original adjective did not agree with the accepted feminine form.

No clear conjugation errors were found in the tables during this pass. The five exercises
accepting two tenses retain their original readings and explanations. Judge tense ambiguity
against the permitted tense cue, rather than requiring all conceivable Italian tenses.

## Identifier and provenance cleanup

Production records omit `source` and use permanent IDs such as `presente-0001`. Do not
renumber them on later edits. Historical imports and the original review keep their IDs.
Tests identify mixed-tense exercises by their accepted analyses rather than a `pilot` prefix.

To cross-reference the pre-review snapshot at commit `9ff7b2d`, the initial rename used each
record's one-based position in its tense partition, padded to four digits. In particular:

- Imported `sent-pres-101`–`160` and `sent-past-101`–`160` became 0001–0060 in their tenses.
- Imported `sent-imp-101`–`140` and `sent-fut-101`–`140` became 0001–0040; `sent-fut-125-v2`
  became `futuro_semplice-0025`.
- Authored `corpus-<tense>-NNN` IDs added 60 to the suffix in present/past, or 40 in
  imperfect/future, then padded to four digits.
- `pilot-multi-001`–`003` became `futuro_semplice-0198`–`0200`; `pilot-multi-004`–`005`
  became `imperfetto-0199`–`0200`.

This positional rule documents a completed rename, not a future ID-generation policy.
The ignored local review folder also contains `id-map.json` with the complete old-to-new map.
The content revision mechanism remains; the one-time fresh-start policy for pre-release
learning state is documented in [the learning model](learning-model.md#storage-and-migration).
