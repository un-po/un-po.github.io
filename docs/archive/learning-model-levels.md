# Learning model

The scheduler is a persistent, browser-local queue. Lower queue positions appear first. It separates three concerns: the latest answer sets a question's basic return distance, rolling contextual scores adjust that distance, and permanent mastery points advance the learner's level.

## Queue and contextual practice

On first use, eligible questions are shuffled with a small level bias, so easier questions tend to appear earlier without forming hard blocks. After an answer:

- an error returns after about 8–14 intervening questions;
- a typo returns after about 12–24 intervening questions;
- a correct answer moves near the back.

The gaps include random jitter and contextual adjustment, and are limited by the available queue size. Repeated misses double their approximate return distance. This prevents a learner with 0% accuracy from becoming trapped in a tiny loop.

Every answer updates rolling scores for the question, verb, and person. Single-tense tasks also update that tense; mixed-tense tasks update only the matched answer’s tense, and do not guess a tense for an unrecognized error. Correct answers have value `1`, typos `0.4`, and errors `0`. A new answer supplies 25% of the score; the prior score retains 75%. Scheduling combines question ×5, verb ×3, person ×1, and tense ×1. Context can pull a question forward by at most one quarter of the queue.

## Mastery and levels

Each presented question offers one permanent mastery point. Correct earns `1`, typo earns `0.4`, and error earns `0`. A later improvement awards only the difference. Repetition cannot farm points.

Level 1 needs 6 points, level 2 needs 8, and later levels need 10. Advancement also requires evidence across at least three verbs and three persons when the available content supports that breadth. Levels never decrease. Questions normally remain active from four levels below the learner through one level above. When an attempted question falls below that window, its unearned fraction becomes missed mastery. An unseen queued question receives one fair attempt; content added later below the window does not create retroactive missed points.

There are 25 learner levels in five-level ranks. “Italiano vero” begins at level 21. Reachable level is capped at four above the highest question level in the current corpus. The active 1,000-question corpus spans question levels 1–19 and four tenses, capping new advancement at level 23. Existing higher learner levels are preserved. See [content bands and validation](content-release.md) for the new curriculum and actual-corpus simulations.

## Pool growth and storage

The learning format is now version 2 in `unpo-learning-state`; version 1 is migrated by adding a content revision while preserving existing records. It contains the queue, learner level and mastery, per-question mastery, rolling context scores, transparent result counts, and repeat streaks. Existing queue order and progress survive pool additions. Newly eligible IDs are merged at randomized level-weighted positions; removed IDs are dropped.

Future storage changes must add an explicit version migration. They must not lower a learner's level, erase earned mastery, or count newly added past-level questions as missed.

## Simulation results

`npm run simulate:scheduler` exercises the real 1,000-question corpus and the original deterministic 500-question corpus across levels 1–15. The table below describes the synthetic baseline; [actual-corpus results](content-release.md) are recorded separately.

| Scenario                  | Result after simulation                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| 100% correct              | Level 19, 500 mastery, 0 missed, all 500 questions seen                                     |
| 0% correct                | Level 1, 0 mastery, all 68 currently eligible questions rotate                              |
| 100% typos                | Level 19, 200 mastery; missed mastery preserves the distinction from perfect accuracy       |
| Two errors, then recovery | Level 19, 197 mastery and 303 missed                                                        |
| All `loro` answers wrong  | `loro` grows from 17% to 41% of exposure but does not monopolize practice                   |
| Pool grows during use     | Existing level, mastery, and relative queue order survive; new content unlocks later levels |

The simulation is a behavioral sanity check, not evidence of learning effectiveness. Constants remain eligible for calibration from real aggregate usage and learner feedback.
