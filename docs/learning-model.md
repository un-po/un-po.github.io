# Band-based practice

The learner-facing model has eight curriculum bands: two for each of present indicative,
passato prossimo, imperfect, and future. Numeric levels, ranks, session points, mastery-point
advancement, and the ruler are absent from the current flow. `ProgressJourney.vue`,
`SessionSummaryStats.vue`, and `.local/progress-lab.*` remain available for later design work.
The previous model is documented in `archive/learning-model-levels.md`.

## Coverage and accuracy

Each question stores its latest outcome and demonstrated tense. Coverage is the fraction of
questions in a band with any answer; accuracy is the fraction of those questions whose latest
answer is fully correct. Typos and errors contribute coverage but zero accuracy. Repeating one
question never manufactures coverage; correcting a mistake improves accuracy, and a later
mistake can reduce it. No best-ever result or weighted mastery currency controls advancement.

A band qualifies through any one exact condition:

| Coverage | Minimum accuracy |
| -------: | ---------------: |
|      60% |             100% |
|      80% |              85% |
|     100% |              70% |

Integer comparisons enforce the thresholds without rounding. Unlocks are permanent, even if
later accuracy declines or new content expands a denominator. New questions contribute to their
assigned band; existing results and unlocks survive additions. Question membership is explicit
in JSON (`band: 1 | 2`); it is not re-sorted at runtime when content grows.

## Rolling window

Initially: present 1 + present 2 + passato prossimo 1 (450 questions). Passing the newest band
opens passato prossimo 2. At four bands, another band opens only when the newest band and the
oldest outgoing band both qualify. The window then drops the oldest band. One answer can unlock
at most one band. Only tense and difficulty band gate advancement; person, verb, and regularity
are not separate unlock requirements.

Questions were divided into equal halves per tense, ordered by difficulty, then the former
content-level metadata, then stable ID. Those old numbers are retained as authoring metadata,
not learner levels. Every tense has person and verb variety in both halves. Initial band sizes
are 150/150 for present and passato prossimo, and 100/100 for imperfect and future.

The queue samples all eligible questions with randomized ordering. An error returns after
roughly 8–14 intervening questions, a typo after roughly 12–24; repeated misses approximately
double the gap, capped by available queue length. Correct answers return near the back.
Rolling contextual strength still adjusts distance, weighted question ×5, verb ×3, person ×1,
and primary tense ×1. The contextual score uses 25% new evidence (correct 1, typo 0.4, error 0)
and 75% prior evidence, with confidence increasing through five samples. This is scheduling
state, not displayed accuracy or progression credit.

Explicit review of an older question updates its original band's evidence; it does not add an
extra band to the window. There is no automatic review outside the four-band window. This is a
bounded-curriculum choice, not a promise of comprehensive long-term retention practice.

## Feedback matrix

The session summary shows tense rows and six person columns, followed by spaced regular and
irregular columns. Each question contributes once to its demonstrated tense/person cell and
once to its tense-specific regularity cell. These are two views of the same answer; they do
not double-count unlock evidence. Regularity metadata is explicit per tense, not a global verb
flag: leggere is regular in the present and has an irregular past participle.

Percentages use the latest result per distinct question. Arrows compare exact saved accuracy
with a snapshot taken at session start. No prior evidence means no arrow; no evidence means a
muted circular dot. Locks indicate never-unlocked tenses, not tenses that have left the rolling window.
Small changes may display the same rounded percentage; tooltips provide counts and the prior
percentage. On narrow screens only the matrix scrolls horizontally.

For a mixed-tense question, accepted answers carry their own tense and explanation. Success
updates the demonstrated tense. An unrecognized error has no inferred tense, so it is reported
separately instead of assigning an invented matrix cell. Either outcome still counts once
against the question's original curriculum band. Trying another valid tense on that question
replaces the prior result; it never creates a second covered question.

## Storage and migration

Storage version 3 in `unpo-learning-state` adds `curriculum.unlocked` and `results`. Versions
1 and 2 migrate explicitly. Old levels, mastery records, contextual counts, and evidence remain
archived in the stored object but are neither updated nor used for advancement. Previously
available tenses are preserved using the old level lookahead; all learners receive at least
the initial three bands. Queue order is retained where still eligible, with new items blended in.

Old best-ever mastery and aggregate question statistics cannot establish a latest tense-aware
answer. The new matrix therefore starts without inferred evidence after migration. Version-3
results and unlocks round-trip without a reset. The local development panel can set unlocked
band count, prioritize a tense, select a question, inspect band readiness, and restore a backup.

## Simulation results

`npm run simulate:scheduler` runs deterministic scenarios against the real 1,000-question corpus.
All run for 5,000 attempts except recovery, which runs for 10,000.

| Scenario                         | Unlocked bands | Distinct questions |                Latest-result accuracy |
| -------------------------------- | -------------: | -----------------: | ------------------------------------: |
| Always correct                   |              8 |              1,000 |                                  100% |
| Always wrong                     |              3 |                450 |                                    0% |
| Always a typo                    |              3 |                450 |                                    0% |
| Always wrong on passato prossimo |              3 |                450 | 67% overall; 0% on the blocking tense |
| Two errors, then correct         |              8 |                977 |                                  100% |
| Always wrong on loro             |              8 |              1,000 |              83% overall; 0% for loro |

The last case deliberately passes through coverage/accuracy without a person gate. That
weakness stays visible in the matrix, but a person is not an unlock bucket.

| Newly available band | Always correct: attempt | Two errors then correct: attempt |
| -------------------- | ----------------------: | -------------------------------: |
| Passato prossimo 2   |                     255 |                              836 |
| Imperfetto 1         |                     626 |                            1,825 |
| Imperfetto 2         |                     952 |                            2,394 |
| Future 1             |                   1,275 |                            3,028 |
| Future 2             |                   1,571 |                            3,585 |

These are seeded behavior checks, not estimates of human learning time. The tests also cover
threshold boundaries, repetition without progress inflation, recovery, outgoing-band gates,
pool growth, migration, locked cells, mixed-tense attribution, and session arrows.

## Feedback presentation

V1 assumes a fresh start; migration machinery and legacy records remain supported. Numbers
use the handwriting font and rounded whole percentages. All cells in a tense row share reveal
timing: decreases enter downward from the upper clipping edge, increases rise from the lower
edge, and unchanged/new observations fade in. Later tense rows begin later and settle more
slowly. Reduced motion and history revisits show final values immediately. Digit-cylinder
animation experiments are deferred beyond v1.

Unlock copy estimates productive correct answers needed to reach the next locked tense,
including intermediate bands and any outgoing-band readiness requirements. It computes the
minimum number of new answers/corrections for each of the three qualification routes, then
sums the route ranges for distinct required bands. The estimate assumes correct answers;
repeated already-correct questions, unrelated practice, and future errors can make actual
submission counts larger. When every tense is open but the final part is locked, that part is
the target. Once all bands are open, the estimate becomes an availability message.
