# Repository Guidelines

## Project Structure & Module Organization

The app is a static Vue 3 and TypeScript SPA. `src/App.vue` coordinates practice, session history, onboarding, and dialogs. Reusable UI lives in `src/components/`; learning, persistence, profile, preference, and theme logic lives in `src/lib/`. Reviewed verbs and exercises are stored in `src/content/*.json`. Unit and content tests are under `tests/`, with Playwright flows in `tests/browser/`. Static files belong in `public/`; production output is generated in `dist/`.

## Build, Test, and Development Commands

- `npm ci` installs the locked dependency set.
- `npm run dev` starts Vite at `http://127.0.0.1:5173`.
- `npm run build` type-checks the app and creates `dist/`.
- `npm test` runs learning-logic, content, profile, and storage tests.
- `npm run test:e2e` checks desktop and mobile browser flows.
- `npm run format:check` verifies Prettier formatting; use `npm run format` to fix it.

Install Playwright’s browser once with `npx playwright install chromium`.

## Coding Style & Naming Conventions

Use TypeScript with strict types and two-space indentation. Prefer small pure functions in `src/lib/`, Vue Composition API in components, and descriptive camelCase identifiers. Components use PascalCase filenames. Keep learner-facing text entirely in Italian; contributor documentation and code identifiers remain in English. Run Prettier before committing.

## Content & Testing Guidelines

Every exercise must reference a verb in `verbs.json`, use one of its six reviewed forms, and include a clear explanation. Avoid ambiguous context unless every intended answer is listed. Add unit tests for grading or scheduling changes and browser tests for meaningful interaction changes. Check keyboard access, reduced motion, local persistence, and narrow viewports when relevant.

## Commit & Pull Request Guidelines

Use concise imperative subjects, such as `Add session history navigation`, and keep commits focused. Pull requests should explain the learner-visible behavior, validation performed, and any content or persistence changes. Include screenshots for visual work and link relevant issues.

## Privacy & Configuration

Never commit `.local/`, credentials, or generated artifacts. Learner answers, names, and preferences stay in browser storage. Document any future analytics or external data transfer before enabling it.
