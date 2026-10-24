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
npm run content:review # Regenerate the Markdown exercise review sheet from JSON
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

- 100 present-indicative sentence drafts across 10 verbs and all six persons;
  the 82 new examples have had an initial LLM review and still need fluent-speaker
  review.
- In-sentence typing, deliberate advancement after every answer, a gentle error
  bounce, and conjugation tables highlighting target and supplied forms.
- Conservative typo detection, session scoring, and a first-attempt accuracy summary.
- A persistent adaptive queue with mastery levels and rolling question, verb,
  person, and tense scores.
- A first-visit introduction with an optional locally saved name.
- Light/dark themes, contextual keyboard hints, reduced motion, and responsive layouts.

The scheduling model has deterministic sanity simulations but is not a claim of
learning effectiveness. Broader tenses, calibration from real use, and progress
export/import are future work. Content supports multiple accepted answers;
current exercises each have one. See [the learning model](docs/learning-model.md).

## Structure

- `src/App.vue`: practice/session flow.
- `src/components/`: theme control and correction table.
- `src/content/`: verbs and exercise JSON; `exercises-pilot.json` holds the new
  82-sentence review batch.
- `src/lib/`: answer grading, review selection, scoring, and storage.
- `src/style.css`: design tokens, both themes, motion, and responsive styles.
- `tests/`: unit/content tests; `tests/browser/`: Playwright interaction tests.
- `docs/product-brief.md`: agreed direction and outstanding decisions.
- `docs/exercise-review.md`: generated review copy for all current exercises.

## Privacy and persistence

There is no application account or server-side learner profile. The versioned
learning state, an optional first name, introduction completion, and the selected
theme are stored in this browser. Clearing site data removes them. Fonts load from
this site, with no Google Fonts requests. Umami collects page views and anonymous counts for session starts,
answer outcomes, and session completion; event data excludes names and typed
answers. If local storage is unavailable, practice continues and the interface
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

Points are computed internally but never shown to learners. Milestones are deferred
until after v1. The correction table starts open; “Non mostrare più questa tabella”
hides it until the learner restores it in settings.

Within a session, Arrow Up and Arrow Down browse completed and current exercises.
Past answers are read-only and retain their original validation feedback. The
vertical position indicator shows at most 20 exercises, with counts for omitted
items.
