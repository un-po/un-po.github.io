# Un po’ — Italian verb practice

A static, Italian-only conjugation practice app. Vue 3, TypeScript, Vite, and
custom CSS.

## Develop locally

Use Node 22.18+ (Node 24 LTS recommended).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Font files currently load from Google Fonts;
system fallbacks remain available when offline. No analytics are enabled.

```sh
npm test               # Answer grading, content validation, review scheduling, storage
npm run build          # Type-check Vue/TypeScript and produce static files in dist/
npm run preview        # Serve the production build locally
npm run format         # Format source with Prettier
npm run format:check   # Check formatting
npx playwright install chromium
npm run test:e2e       # Desktop and mobile Chromium interaction checks
```

The unit tests use Node's built-in runner and can run before installing packages.
The browser tests require installed dependencies and a Chromium download.
Dependencies are pinned in `package-lock.json`. Use `npm ci` for reproducible
installation in CI. The production build and unit tests have been verified.

## Current scope

- 18 reviewed sample sentences, 10 verbs, all six persons, present indicative.
- In-sentence typing, deliberate advancement after every answer, a gentle error
  bounce, and conjugation tables highlighting target and supplied forms.
- Conservative typo detection, session scoring, and a first-attempt accuracy summary.
- A small spaced review loop, with the last 500 attempts saved locally.
- A first-visit introduction with an optional locally saved name.
- Light/dark themes, contextual keyboard hints, reduced motion, and responsive layouts.

The v1 design and interface copy are complete, but this is not yet a calibrated
learning system. Per-skill ability
estimation, broader tenses, progress export/import, and analytics are future work.
Content supports multiple accepted answers; current exercises each have one.

## Structure

- `src/App.vue`: practice/session flow.
- `src/components/`: theme control and correction table.
- `src/content/`: verbs and exercise JSON; update both consistently.
- `src/lib/`: answer grading, review selection, scoring, and storage.
- `src/style.css`: design tokens, both themes, motion, and responsive styles.
- `tests/`: unit/content tests; `tests/browser/`: Playwright interaction tests.
- `docs/product-brief.md`: agreed direction and outstanding decisions.

## Privacy and persistence

There is no application backend or account. Up to 500 recent answers, an optional first name, introduction completion, and
the selected theme are stored in this browser. Clearing site data removes them.
Google Fonts receives font requests. If local storage is unavailable, practice
continues and the interface reports that results could not be saved.

## GitHub setup

The intended owner is `ricoboni`. Use the isolated CLI wrapper:

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

Set your personal commit name/email locally before the first commit. Hosting is
planned for GitHub Pages. The build uses relative asset paths, allowing a project
subdirectory. No remote repository, CI pipeline, or deployment has been created.

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
