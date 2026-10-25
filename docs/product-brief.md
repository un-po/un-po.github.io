# Product brief

## Experience

All learner-facing copy is Italian, including accessibility labels. The interface
is minimal, typography-led, keyboard-friendly, and comfortable on mobile.
Transitions communicate progress and feedback and respect reduced motion.

The v1 design and interface copy are approved. The practice screen includes
correct-answer, incorrect-answer, and session-summary states with shared
typography, spacing, colour, and motion choices.

## Architecture

Vue 3, TypeScript, Vite, and custom CSS. Reviewed JSON content, browser-local
progress, and eventual export/import. Static hosting on GitHub Pages, with
GitHub Actions for validation and deployment. No runtime AI or application API.

## Learning model

Begin with present indicative, all six persons, regular verbs, and a small set
of common irregular verbs. Separate verbs, exercises, and curriculum metadata.
Support multiple reviewed accepted answers from the beginning. Distinguish
specified-tense exercises from open contextual exercises; award skill evidence
for the answer actually produced.

Maintain rolling scores per question, verb, person, and tense. A persistent queue
spaces errors, typos, and correct answers differently, then uses contextual
weakness to bring related practice forward. Permanent per-question mastery points
advance 25 numeric levels; missed points preserve the distinction between breadth
of mastery and simply moving forward. The final “Italiano vero” rank begins at
level 21 and remains beyond the planned 500-question v1 corpus. Full rules and
simulation results are in `docs/learning-model.md`.

Classify exact answers, probable typos, and grammatical errors. Check known
conjugated forms before applying similarity heuristics. Correction tables show
the requested form and, when identifiable, the supplied form. Keep corrections
visible until the learner continues.

Session summaries show first-attempt accuracy and completed sentences, followed
by the learner's progress along the level path. App practice level is not CEFR
certification.

## Open decisions

- Repository and product names.
- Two or three visual references, ideally noting typography, colour, or motion.
- Analytics provider and whether aggregate custom events are needed.
- Personal commit email and content/code licences before public release.

## V1 design

Name: Un po’. Playpen Sans for the sentence and input; Playwrite IT
Trad sparingly for short feedback headings; system sans-serif for longer text.
Near-white/charcoal canvases with broad sage and lavender colour fields. Organic
colour and motion, without imitation paper, objects, or textures. Decoration is
low contrast; functional text remains readable.

All answers wait for deliberate continuation. Advancing uses a larger, slower
upward exit and a soft entrance from below. Errors start an upward movement and
bounce gently back before correction. The person is inferred from the sentence.
Supporting text is larger; scoring is hidden and session controls share a quiet
link row below the primary action. Feedback has reserved space so it does not
push the sentence around.
A first-visit introduction offers an optional locally stored name. Returning
learners see a brief welcome screen with their current level and rank before a
new session. Respect reduced motion. Light and dark themes are available and
saved locally.

This prototype is implemented locally. Dependencies are installed and pinned;
the production build and unit tests pass. A local development preview is available.

## V1 release work

The design, interface copy, hosting setup, analytics, and locally hosted fonts are
in place. Remaining v1 work:

- **Profiles:** consider multiple browser-local learner profiles later. This is
  an idea to evaluate, not a first-release commitment. Keep learning histories
  separate if implemented.
- **Content:** the 100 present-indicative sentences across 10 verbs have had an
  initial LLM review. Get a fluent-speaker review, record provenance for future
  additions, then decide the launch corpus size and next verbs.
- **Learning model:** calibrate the implemented queue, contextual scores, and
  mastery thresholds through continued simulations and real aggregate usage.
- **Release checks:** finish cross-browser and accessibility checks, walk through
  first visit, practice, history, settings, reset, and session end, then verify the
  production Pages deployment. CI builds and deploys `main`; Umami is configured.

Multiple browser-local profiles, milestones, broader tenses, progress
export/import, and a fully calibrated per-skill learning model are candidates for
after v1 unless content review or learner feedback makes one essential.

## Progress presentation and workflow decisions

Numeric mastery points are hidden everywhere in the learner interface. The
header stays quiet; level and rank appear on the returning-learner screen. The
session summary leads with an abstract numbered path from its starting position
to its ending position, retaining the start as a faint marker. Both the ruler
and session statistics reveal from a shared horizontal seam: the ruler rises
from below while the statistics descend from above, and both settle over 1.7
seconds. The ruler begins moving after 0.9 seconds, so its journey is already
underway as it appears. Levels use Arabic
numbers; five-level ranks use Roman numerals. Rank V is called “Italiano vero”,
as a playful practice rank rather than a claim of fluency. Other milestones are
deferred until after v1. The hollow starting marker, ruler, ticks, and numbers
fade into view. The ruler travels at a steady
pace, with longer progress taking longer, while a tracking line grows between
the marker borders. The destination dot emerges from the ruler and releases an
expanding, fading halo. Every fifth level uses a thicker tick without changing
its height. When the learner returns from session history, the completed ruler
and statistics appear immediately, and only the halo repeats.

The correction explanation stays visible. Its conjugation table starts open and
can be retired with “Non mostrare più questa tabella”; settings restore it later.
After validation, the next sentence arrives automatically after a generous
reading interval: 4 seconds for a correct answer, 7 seconds for a mistake, and
10 seconds when the conjugation table is visible. The primary button visualizes
the interval, remains available for immediate continuation, and a quiet “Resta
qui” action cancels automatic continuation.

The full ruler journey is reserved for clearly visible progress. Sessions with
no movement or only a tiny fractional change use a shorter, stationary reveal
instead, avoiding ceremony that overstates the result.

Settings now own name editing, system/light/dark theme choice, table visibility,
and a permanent progress reset. “Il resto” contains the usage guide,
motivation, author link, and privacy explanation. Multiple profiles remain a
separate future decision.

Arrow Up and Arrow Down browse the current session. Past exercises are read-only
and show their original validation state; the current exercise remains the only
editable item. A vertical indicator fades at the current exercise, stays visible
while reviewing, shows at most 20 dots, and reports omitted items above or below.
The summary is the final history endpoint: Arrow Up reopens the latest answer,
Arrow Down returns from it, and the coloured dots can be selected directly to
inspect correct answers or mistakes on touch devices. The first-visit screen is
not part of this history because it contains no answer to review. The wordmark
never resets an active session. Escape closes an open dialog, or ends the session
when the learner is on the practice screen.
