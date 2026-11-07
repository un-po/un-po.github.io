# Original import archive

**Historical source snapshot.** The corrected 1,000-sentence corpus is now in `src/content/`.
See the [initial review](../../content-import-review.md), [plan](../../content-import-plan.md),
and [implementation report](../../content-release.md). These files preserve the supplied
material and known defects; they are not loaded by the app.

## Organization

- `sentences/indicativo-presente.json`: 60 sentences.
- `sentences/passato-prossimo.json`: 60 sentences.
- `sentences/imperfetto.json`: 40 sentences.
- `sentences/futuro-semplice.json`: 40 sentences.
- `verbs.json`: 47 supplied verb metadata records.
- `source-notes/`: the supplied architecture, schema, and engine proposals, renamed for clarity.
- `import-manifest.json`: original filenames, SHA-256 hashes, destination files, record IDs,
  duplicate handling, and syntax repair.
- `examples/multi-tense-pilot.json`: five newly authored design examples with structured
  answers in two tenses each. These original drafts are separate from the 200 imported records. Their validated copies
  are included in the production corpus; these snapshots are not loaded by the app.

The current agreed goal is **1,000 approved sentences**, distributed 300/300/200/200 across
the four tense partitions. Five multi-tense exercises will count within that total, once each
under a primary curriculum tense. The historical source notes retain their original target.

The supplied notes describe a **2,000-sentence target**, but these exports contain **200 unique
sentences**, all with one target. Each original sentence batch contains ten records. One
passato prossimo batch was an identical duplicate and was merged only once. The unquoted
`approverà` in `sent-fut-136` was quoted to make its batch valid JSON. Sentence wording,
answers, IDs, metadata, and explanations otherwise remain as supplied, including known errors.

Exact original downloads are backed up in `.local/content-import-originals/` on the importing
machine. That directory is ignored and is not part of the repository. The manifest provides
provenance for the consolidated files; the original notes remain reference material, not an
approved specification.

## Review workflow

Run `node scripts/audit-new-content.mjs` from the repository root. It checks JSON structure,
IDs, slots, answer lists, partition tenses, and verb references. It currently exits with code
1 because 14 referenced verbs are absent. A passing structural audit would **not** certify
conjugations, natural Italian, or complete accepted alternatives.

Resolve the linguistic findings and complete reviewed paradigms before promoting any data.
Keep sentence IDs stable through editorial corrections; use a new ID when the learning target
changes materially. Add new exports through the same audit and update the manifest before
merging. The intended production destination is `src/content/sentences/`, replacing the old
corpus after validation, rather than appending to it.
