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

Maintain confidence per skill and verb. An initial scheduling hypothesis is
60% current-ability practice, 25% due reviews, and 15% exploration. Space mistakes
across intervening questions and future sessions. Treat these proportions as
tunable, not established learning guarantees.

Classify exact answers, probable typos, and grammatical errors. Check known
conjugated forms before applying similarity heuristics. Correction tables show
the requested form and, when identifiable, the supplied form. Keep corrections
visible until the learner continues.

Session summaries separate first-attempt accuracy, typo count, points, and
average exercise difficulty. App practice level is not CEFR certification.

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
A first-visit introduction offers an optional locally stored name. Keyboard hints
appear after a click and retire after keyboard use or repeated clicks.
Respect reduced motion. Light and dark themes are available and saved locally.

This prototype is implemented locally. Dependencies are installed and pinned;
the production build and unit tests pass. A local development preview is available.

## V1 release work

The design and interface copy are complete. Remaining release work is additive:

- **Profiles:** consider multiple browser-local learner profiles later. This is
  an idea to evaluate, not a first-release commitment. Keep learning histories
  separate if implemented.
- **Content:** add more sentences beyond the current 18. Decide breadth, review
  standards, and the minimum useful curriculum for the first release.
- **Learning model:** replace the prototype scheduler with per-skill confidence,
  calibrated difficulty, and spaced review of persistent mistakes.
- **Release:** review the Italian content, self-host fonts, and finish
  cross-browser and accessibility checks. Umami aggregate analytics and automatic
  GitHub Pages deployment are now configured.

## Progress presentation and workflow decisions

Numeric points are hidden everywhere in the learner interface. Milestones are
deferred until after v1. If introduced later, they should consider accuracy and
breadth alongside points so repeating easy questions cannot imply broad mastery.
“Italiano vero” remains a possible final milestone name, not a claim of fluency.

The correction explanation stays visible. Its conjugation table starts open and
can be retired with “Non mostrare più questa tabella”; settings restore it later.

Settings now own name editing, system/light/dark theme choice, table visibility,
and a permanent progress reset. “Il resto” contains the usage guide,
motivation, author link, and privacy explanation. Multiple profiles remain a
separate future decision.

Arrow Up and Arrow Down browse the current session. Past exercises are read-only
and show their original validation state; the current exercise remains the only
editable item. A vertical indicator fades at the current exercise, stays visible
while reviewing, shows at most 20 dots, and reports omitted items above or below.
The wordmark never resets an active session. Escape closes an open dialog, or ends
the session when the learner is on the practice screen.
