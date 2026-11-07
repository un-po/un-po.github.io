# Content and practice release

The app now uses 1,000 sentences across 60 verbs: 300 present, 300 passato prossimo, 200
imperfect, and 200 future. Five single-blank exercises accept two tenses. Complete explicit
paradigms cover all six persons and the four tenses; accepted answers have their own tense,
person, and explanation. The loader validates IDs, templates, references, forms, bands, and
per-tense regularity metadata.

The 200 supplied unique examples were edited; 795 further examples and five mixed-tense pilots
were authored. Imported originals, provenance hashes, and initial findings are preserved under
`content-import/source/`. The content has received the coding assistant's editorial pass and
automated checks. It has not received an independent fluent-speaker review. Use
`npm run content:review` to export the four sentence sheets and verb tables to
`.local/content-review/` for that focused review. JSON remains the source of truth.

The learner-facing progression now uses eight explicit bands, coverage/accuracy unlocks,
and a rolling four-band window, starting with three. The summary shows accuracy by tense,
person, and regularity, plus arrows relative to session start. Levels, ranks, and numeric
mastery advancement have been removed from the live flow. The ruler component and local
animation lab are preserved for later reuse.

See [the current learning model](learning-model.md) for the exact thresholds, feedback
semantics, storage-v3 migration, simulation results, and deliberate tradeoffs. The earlier
level-based implementation report is preserved in `archive/content-release-levels.md`.

The development-only panel remains excluded from production. Static corpus bundles are split
by tense for independent caching. No additional learner-data transfers or analytics events
were introduced. Existing short-answer feedback, keyboard history, timed continuation,
settings, and reduced-motion behavior remain covered by browser tests.
