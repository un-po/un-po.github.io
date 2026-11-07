# Un po’ product brief

Offer fair, thoughtful Italian conjugation practice in a calm, welcoming interface. Learning
and useful feedback provide the reward. Keep the learner-facing app entirely in Italian,
static and API-less, with progress stored in the browser. Preserve the established teal
palette, light/dark/system themes, organic background, and Playpen Sans / Playwrite typography.

## Practice and feedback

One sentence and one blank at a time, with a visible tense cue. Accept every reviewed answer
variant. Five exercises allow two tenses, with answer-specific explanations and attribution.
Give clear correct/error feedback, conservative typo handling, and optional tense-aware tables.
Keep keyboard navigation through session history, timed continuation with cancellation, and
inline onboarding instead of an introductory screen.

At session end, show a matrix with tense rows; person columns; then regular/irregular columns
separated by a wider gap. Percentages measure the latest answer to each distinct question.
Arrows compare saved accuracy with session-start accuracy; locks identify unavailable tenses.
No numeric levels, ranks, session points, or mastery-point advancement in the live flow.

## Availability

Two difficulty bands per tense. Start with present 1 + present 2 + passato prossimo 1; expand
to four bands, then slide the window by one. A band qualifies with 60% coverage / 100% accuracy,
80% / 85%, or 100% / 70%. The newest and any outgoing band must qualify for the next unlock.
People and regularity guide feedback and repetition but do not independently gate advancement.
See [the learning model](learning-model.md) for complete semantics and simulated behavior.

## Release scope and follow-up

The corpus contains 1,000 sentences across four tenses and 60 verbs. It needs a focused
independent language review before the content is treated as independently checked. Run the
validation gate before committing/deploying the replacement. The development-only panel
supports band injection, exact questions, state inspection, and backup/restore.

Retain `ProgressJourney.vue`, `SessionSummaryStats.vue`, and `.local/progress-lab.*` for later
progress visualization work. The earlier visual specifications are preserved in
`archive/product-brief-levels.md`; the ruler animation must not be discarded.

Future candidates include profile support, progress export/import, more tenses, multiple
simultaneous blanks, and deliberate long-term review beyond the active window. These are
separate from the release scope.
