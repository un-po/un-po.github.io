# Un po’ — Italian verb practice

A static, Italian-only conjugation practice app. Vue 3, TypeScript, Vite, and
custom CSS.

## Develop locally

Use Node 22.18+ (Node 24 LTS recommended).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The two display fonts are served from
`public/fonts/`; system fallbacks remain available. Umami records anonymous page
views and practice events in production.

```sh
npm test               # Answer grading, content validation, review scheduling, storage
npm run content:review # Export four tense review sheets and verb tables to .local/content-review/
npm run simulate:scheduler # Run deterministic scheduler sanity scenarios
npm run build          # Type-check Vue/TypeScript and produce static files in dist/
npm run check          # Run formatting, unit, desktop/mobile browser, and build checks
npm run preview        # Serve the production build locally
npm run format         # Format source with Prettier
npm run format:check   # Check formatting
npx playwright install chromium
npm run test:e2e       # Desktop and mobile Chromium interaction checks
```

The unit tests use Node's built-in runner and can run before installing packages.
The browser tests require installed dependencies and a Chromium download.
Before a substantial change or pull request, run `npm run check`. It matches the
validation gate in GitHub Actions. Playwright needs Chromium installed and uses
port 5173; stop an old dev server there if you want Playwright to start a fresh one.
Dependencies are pinned in `package-lock.json`; use `npm ci` for reproducible
installation in CI.

## Current scope

- 1,000 sentences across 60 verbs: 300 present, 300 passato prossimo, 200 imperfetto,
  and 200 future, including five questions accepting two tenses. Complete paradigms
  cover all six persons; visible cues specify the permitted tense(s).
- In-sentence typing, timed continuation with an option to stay, a brief answer
  color wash, and conjugation tables highlighting target and supplied forms.
- Conservative typo detection and saved accuracy by tense, person, and regularity.
- A persistent adaptive queue with eight curriculum bands, coverage/accuracy unlocks,
  and a rolling window of four bands, starting with three.
- Immediate practice with timed first-use instructions and an optional locally
  saved name; returning-learner greetings and available tenses appear inline.
- Light/dark themes, contextual keyboard hints, reduced motion, and responsive layouts.

The scheduling model has deterministic sanity simulations but is not a claim of
learning effectiveness. Additional tenses, calibration from real use, multiple blanks,
and progress export/import remain future work. See [the learning model](docs/learning-model.md)
and [content implementation report](docs/content-release.md), including linguistic review scope.

## Structure

- `src/App.vue`: practice/session flow.
- `src/components/`: practice prompts, dialogs, theme control, correction tables,
  and summary animations.
- `src/content/`: full verb paradigms and four JSON sentence partitions, loaded through
  `src/lib/content.ts`. Each accepted answer carries its own tense and explanation.
- `src/lib/`: answer grading, review selection, band progression, feedback, and storage.
- `src/style.css`: design tokens, both themes, motion, and responsive styles.
- `tests/`: unit/content tests; `tests/browser/`: Playwright interaction tests.
- `docs/product-brief.md`: agreed direction and outstanding decisions.
- `docs/content-import/source/`: the preserved original import and its provenance manifest.
- `.local/content-review/`: generated, ignored review sheets for the current corpus.

## Privacy and persistence

There is no application account or server-side learner profile. The versioned
learning state, an optional first name, onboarding progress, and the selected
theme are stored in this browser. Clearing site data removes them. Fonts load from
this site, with no Google Fonts requests. Umami collects page views and anonymous counts for session starts,
answer outcomes, and session completion; a session starts with its first submitted
answer. Event data excludes names and typed answers. If local storage is unavailable, practice continues and the interface
reports that results could not be saved.

## GitHub setup

The repository is owned by the `un-po` organization and maintained through the
`ricoboni` account. Use the isolated CLI wrapper:

```sh
./scripts/gh-project login
./scripts/gh-project api user --jq .login
./scripts/configure-git
```

Verify that the account prints `ricoboni` before creating a repository or pushing.
The wrapper clears inherited GitHub token variables and uses `.local/gh/`.
Login uses `--insecure-storage` to avoid the shared system credential store: the
token is plaintext in an ignored directory with restricted permissions. Do not
share that directory. Global work settings remain unchanged.

GitHub Actions validates pull requests and pushes to `main`, then deploys successful
`main` builds to [GitHub Pages](https://un-po.github.io/). The build uses relative
asset paths so it also remains portable to a future custom domain.

## License

Application code is available under the [MIT License](LICENSE). Learning content
in `src/content/` is available under
[CC BY 4.0](src/content/LICENSE.md). Third-party fonts retain their own licenses.

## Learner controls

Settings allow learners to edit or clear their name, choose the system/light/dark
theme, restore conjugation tables, and reset their saved progress. “Il resto”
explains the practice flow, project motivation, and local-only data model.

The session summary shows latest-answer accuracy per distinct question and changes since
session start. Session points, numeric levels, and mastery-point advancement are retired.
Milestones are deferred until after v1. The correction table starts open; “Non mostrare più questa tabella”
hides it until the learner restores it in settings.

Within a session, Arrow Up and Arrow Down browse completed and current exercises.
Past answers are read-only and retain their original validation feedback. The
vertical position indicator shows at most 20 exercises, with counts for omitted
items.

## Development tools

The local Vite app shows a **Sviluppo** button at the bottom left. Its panel can set a learner
unlocked-band count, prioritize a tense, or jump to an exact exercise, and inspect saved learning data.
The first injection saves a backup; **Ripristina progressi originali** restores it. Changes
reload the page and end the current in-memory session. The panel is excluded from production.

With the development panel open, the app uses the remaining desktop width; on narrow screens
the panel is stacked above it. **Corretta**, **Refuso**, and **Sbagliata** fill and submit
the current question through normal grading. A typo is generated only when the grader can
actually recognize one; short or ambiguous forms may not permit it.
