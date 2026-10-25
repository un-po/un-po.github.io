<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import ThemeToggle from './components/ThemeToggle.vue';
import ConjugationTable from './components/ConjugationTable.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import InformationDialog from './components/InformationDialog.vue';
import ProgressJourney from './components/ProgressJourney.vue';
import SessionSummaryStats from './components/SessionSummaryStats.vue';
import rawVerbs from './content/verbs.json';
import rawExercises from './content/exercises.json';
import rawPilotExercises from './content/exercises-pilot.json';
import { gradeAnswer, normalize, summarize } from './lib/practice.ts';
import type { Attempt, Exercise, Outcome, Verb } from './lib/practice.ts';
import {
  masteryTarget,
  maximumReachableLevel,
  nextLearningExercise,
  recordLearningOutcome,
} from './lib/learning.ts';
import { clearLearningState, loadLearningState, saveLearningState } from './lib/storage.ts';
import { loadProfile, saveProfile } from './lib/profile.ts';
import { loadTableVisibility, saveTableVisibility } from './lib/preferences.ts';
import { trackEvent } from './lib/analytics.ts';

interface SessionItem {
  exercise: Exercise;
  answer: string;
  outcome: Outcome | null;
}

const verbs = rawVerbs as Verb[];
const exercises = [...(rawExercises as Exercise[]), ...(rawPilotExercises as Exercise[])];
const profile = loadProfile();
const learnerName = ref(profile.name);
const learning = ref(loadLearningState(exercises));
const attempts = ref<Attempt[]>([]);
const showConjugation = ref(loadTableVisibility());
const firstExercise = nextLearningExercise(learning.value, exercises);
const sessionItems = ref<SessionItem[]>([{ exercise: firstExercise, answer: '', outcome: null }]);
const displayedIndex = ref(0);
const screen = ref<'intro' | 'welcome' | 'practice' | 'summary'>(
  profile.introduced ? 'welcome' : 'intro',
);
const transitioning = ref(false);
const sentenceVisible = ref(true);
const reviewingFinishedSession = ref(false);
const summaryRevisited = ref(false);
const autoAdvanceActive = ref(false);
const autoAdvanceDuration = ref(0);
const input = ref<HTMLInputElement>();
const settings = ref<InstanceType<typeof SettingsDialog>>();
const information = ref<InstanceType<typeof InformationDialog>>();
const settingsTrigger = ref<HTMLButtonElement>();
const informationTrigger = ref<HTMLButtonElement>();
const storageAvailable = ref(true);
const historyIndicatorVisible = ref(false);
let indicatorTimer: ReturnType<typeof setTimeout> | undefined;
let continueTimer: ReturnType<typeof setTimeout> | undefined;

function currentProgressPosition(): number {
  const learner = learning.value.learner;
  const atContentLimit = learner.level >= maximumReachableLevel(exercises);
  const fraction = atContentLimit
    ? 0
    : Math.min(1, learner.levelProgress / masteryTarget(learner.level));
  return learner.level - 1 + fraction;
}

const sessionStartPosition = ref(currentProgressPosition());
const sessionStartLevel = ref(learning.value.learner.level);

const currentIndex = computed(() => sessionItems.value.length - 1);
const displayedItem = computed(() => sessionItems.value[displayedIndex.value]!);
const exercise = computed(() => displayedItem.value.exercise);
const answer = computed(() => displayedItem.value.answer);
const outcome = computed(() => displayedItem.value.outcome);
const verb = computed(() => verbs.find((item) => item.id === exercise.value.verb)!);
const isReviewing = computed(
  () => reviewingFinishedSession.value || displayedIndex.value !== currentIndex.value,
);
const stats = computed(() => summarize(attempts.value));
const progressPosition = computed(currentProgressPosition);
const rankNumeral = computed(
  () => ['I', 'II', 'III', 'IV', 'V'][Math.ceil(learning.value.learner.level / 5) - 1],
);
const mistakes = computed(() => [
  ...new Set(
    attempts.value
      .filter((attempt) => attempt.outcome !== 'correct')
      .map((attempt) => attempt.verb),
  ),
]);
const answerWidth = computed(
  () =>
    Math.min(13, Math.max(7, ...exercise.value.answers.map((value) => value.length + 1))) + 'ch',
);
const feedbackHeading = computed(() =>
  outcome.value === 'correct'
    ? learnerName.value
      ? `Esatto, ${learnerName.value}!`
      : 'Esatto!'
    : outcome.value === 'typo'
      ? 'Quasi! Solo un refuso.'
      : 'Riproviamo insieme.',
);
const lastAnsweredIndex = computed(() => {
  for (let index = sessionItems.value.length - 1; index >= 0; index -= 1) {
    if (sessionItems.value[index]?.outcome) return index;
  }
  return -1;
});
const indicator = computed(() => {
  const finalIndex =
    reviewingFinishedSession.value || screen.value === 'summary'
      ? lastAnsweredIndex.value
      : currentIndex.value;
  const total = finalIndex + 1;
  const size = Math.min(20, total);
  const maxStart = Math.max(0, total - size);
  const anchor = screen.value === 'summary' ? finalIndex : displayedIndex.value;
  const start = Math.max(0, Math.min(anchor - Math.floor(size / 2), maxStart));
  return {
    before: start,
    after: total - (start + size),
    indexes: Array.from({ length: size }, (_, offset) => start + offset),
  };
});

function historyItemLabel(index: number): string {
  const result = sessionItems.value[index]?.outcome;
  const status = result === 'correct' ? 'corretta' : result ? 'da rivedere' : 'in corso';
  return `Frase ${index + 1}: ${status}`;
}

function begin() {
  learnerName.value = learnerName.value.trim().slice(0, 40);
  storageAvailable.value = saveProfile(learnerName.value);
  startSession();
}

function startSession() {
  sessionStartPosition.value = currentProgressPosition();
  sessionStartLevel.value = learning.value.learner.level;
  reviewingFinishedSession.value = false;
  summaryRevisited.value = false;
  cancelAutoAdvance();
  screen.value = 'practice';
  trackEvent('session_started');
  focusAnswer();
}

function focusAnswer() {
  nextTick(() => {
    if (
      window.matchMedia('(pointer: fine)').matches &&
      screen.value === 'practice' &&
      !isReviewing.value &&
      !outcome.value
    ) {
      input.value?.focus();
    }
  });
}

function updateAnswer(event: Event) {
  if (isReviewing.value || outcome.value) return;
  displayedItem.value.answer = (event.target as HTMLInputElement).value;
}

function cancelAutoAdvance() {
  clearTimeout(continueTimer);
  autoAdvanceActive.value = false;
}

function scheduleAutoAdvance(result: Outcome) {
  clearTimeout(continueTimer);
  const delay = result === 'correct' ? 4000 : showConjugation.value ? 10000 : 7000;
  autoAdvanceDuration.value = delay;
  autoAdvanceActive.value = true;
  continueTimer = setTimeout(() => {
    autoAdvanceActive.value = false;
    if (screen.value === 'practice' && !isReviewing.value && outcome.value) advance();
  }, delay);
}

function submit(dontKnow = false) {
  if (transitioning.value || isReviewing.value) return;
  if (outcome.value) {
    advance();
    return;
  }
  if (!normalize(answer.value) && !dontKnow) {
    input.value?.focus();
    return;
  }

  const result = dontKnow ? 'error' : gradeAnswer(answer.value, exercise.value.answers, verbs);
  trackEvent(
    result === 'correct'
      ? 'answer_correct'
      : result === 'typo'
        ? 'answer_typo'
        : 'answer_incorrect',
  );
  displayedItem.value.outcome = result;
  const attempt: Attempt = {
    exerciseId: exercise.value.id,
    verb: verb.value.id,
    person: exercise.value.person,
    answer: answer.value.trim(),
    outcome: result,
    difficulty: exercise.value.difficulty,
    timestamp: Date.now(),
  };
  attempts.value.push(attempt);
  recordLearningOutcome(learning.value, exercise.value, result, exercises);
  storageAvailable.value = saveLearningState(learning.value);
  scheduleAutoAdvance(result);
}

function advance() {
  if (transitioning.value || isReviewing.value || !outcome.value) return;
  cancelAutoAdvance();
  transitioning.value = true;
  sentenceVisible.value = false;
}

function createNextExercise() {
  if (!transitioning.value) return;
  const next = nextLearningExercise(learning.value, exercises);
  storageAvailable.value = saveLearningState(learning.value);
  sessionItems.value.push({ exercise: next, answer: '', outcome: null });
  displayedIndex.value = currentIndex.value;
  sentenceVisible.value = true;
}

function sentenceReady() {
  if (transitioning.value) transitioning.value = false;
  focusAnswer();
}

function showIndicator() {
  clearTimeout(indicatorTimer);
  historyIndicatorVisible.value = true;
  if (!isReviewing.value) {
    indicatorTimer = setTimeout(() => {
      historyIndicatorVisible.value = false;
    }, 2600);
  }
}

function navigateSession(direction: -1 | 1) {
  if (screen.value === 'summary') {
    if (direction === -1 && lastAnsweredIndex.value >= 0) {
      reviewSessionItem(lastAnsweredIndex.value, true);
    }
    return;
  }
  if (screen.value !== 'practice' || transitioning.value) return;
  const finalIndex = reviewingFinishedSession.value ? lastAnsweredIndex.value : currentIndex.value;
  if (reviewingFinishedSession.value && direction === 1 && displayedIndex.value >= finalIndex) {
    returnToSummary();
    return;
  }
  const target = Math.max(0, Math.min(finalIndex, displayedIndex.value + direction));
  if (target === displayedIndex.value) return;
  cancelAutoAdvance();
  displayedIndex.value = target;
  showIndicator();
}

function reviewSessionItem(index: number, fromSummary = false) {
  const reviewingSummary =
    fromSummary || screen.value === 'summary' || reviewingFinishedSession.value;
  const finalIndex = reviewingSummary ? lastAnsweredIndex.value : currentIndex.value;
  if (index < 0 || index > finalIndex) return;
  cancelAutoAdvance();
  reviewingFinishedSession.value = reviewingSummary;
  screen.value = 'practice';
  displayedIndex.value = index;
  showIndicator();
}

function returnToSummary() {
  summaryRevisited.value = true;
  screen.value = 'summary';
  historyIndicatorVisible.value = false;
  nextTick(() => document.getElementById('summary-heading')?.focus());
}

function handleSessionKeys(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'Escape') {
    if (!document.querySelector('dialog[open]') && screen.value === 'practice') finish();
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    navigateSession(-1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    navigateSession(1);
  }
}

function finish() {
  if (screen.value !== 'practice') return;
  if (reviewingFinishedSession.value) {
    returnToSummary();
    return;
  }
  trackEvent('session_completed');
  cancelAutoAdvance();
  transitioning.value = false;
  sentenceVisible.value = true;
  historyIndicatorVisible.value = false;
  reviewingFinishedSession.value = false;
  summaryRevisited.value = false;
  screen.value = 'summary';
  nextTick(() => document.getElementById('summary-heading')?.focus());
}

function returnToCurrentExercise() {
  if (screen.value === 'intro' || screen.value === 'welcome') return;
  reviewingFinishedSession.value = false;
  screen.value = 'practice';
  displayedIndex.value = currentIndex.value;
  showIndicator();
  focusAnswer();
}

function setName(value: string) {
  learnerName.value = value.trimStart().slice(0, 40);
  storageAvailable.value = saveProfile(learnerName.value);
}

function setConjugationVisibility(value: boolean) {
  cancelAutoAdvance();
  showConjugation.value = value;
  saveTableVisibility(value);
}

function resetProgress() {
  storageAvailable.value = clearLearningState();
  if (!storageAvailable.value) {
    window.alert('Il browser non permette di cancellare i progressi salvati.');
    return;
  }
  learning.value = loadLearningState(exercises);
  attempts.value = [];
  const next = nextLearningExercise(learning.value, exercises);
  sessionItems.value = [{ exercise: next, answer: '', outcome: null }];
  displayedIndex.value = 0;
  reviewingFinishedSession.value = false;
  summaryRevisited.value = false;
  cancelAutoAdvance();
  sessionStartPosition.value = currentProgressPosition();
  sessionStartLevel.value = learning.value.learner.level;
  screen.value = 'practice';
  settings.value?.close();
  focusAnswer();
}

function openPrivacy() {
  nextTick(() => information.value?.open('privacy'));
}

function openInformation() {
  cancelAutoAdvance();
  information.value?.open();
}

function openSettings() {
  cancelAutoAdvance();
  settings.value?.open();
}

onMounted(() => {
  window.addEventListener('keydown', handleSessionKeys);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSessionKeys);
  clearTimeout(indicatorTimer);
  clearTimeout(continueTimer);
});
focusAnswer();
</script>

<template>
  <div class="app-shell">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>
    <header class="site-header">
      <button
        class="wordmark"
        type="button"
        aria-label="Torna all’esercizio corrente"
        @click="returnToCurrentExercise"
      >
        un po<span class="wordmark-apostrophe">’</span
        ><span class="brand-dot" aria-hidden="true"></span>
      </button>
      <span class="brand-caption">una frase alla volta</span>
      <nav aria-label="Informazioni e preferenze">
        <button
          ref="informationTrigger"
          class="quiet-button help-button"
          type="button"
          @click="openInformation"
        >
          Il resto
        </button>
        <span class="nav-divider" aria-hidden="true"></span>
        <button
          ref="settingsTrigger"
          class="icon-button"
          type="button"
          aria-label="Apri le impostazioni"
          @click="openSettings"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h5m4 0h7M4 17h7m4 0h5" />
            <circle cx="11" cy="7" r="2" />
            <circle cx="13" cy="17" r="2" />
          </svg>
        </button>
        <ThemeToggle />
      </nav>
    </header>

    <main v-if="screen === 'intro'" class="introduction" aria-labelledby="intro-heading">
      <h1 id="intro-heading">Sbagliando,<br />una frase alla volta.</h1>
      <p class="intro-tagline">Finché viene naturale.</p>
      <div class="intro-explanation">
        <p>
          Trova il verbo che manca. Scrivi la coniugazione giusta e premi
          <strong>Invio</strong> per verificare o continuare.
        </p>
        <p>
          Durante la pratica, usa <strong>↑</strong> e <strong>↓</strong> per rivedere le frasi
          della sessione. La frase successiva arriva da sé, oppure scegli
          <strong>Resta qui</strong> per fermarti. Se sbagli, guardiamo insieme la coniugazione.
        </p>
      </div>
      <form class="intro-form" @submit.prevent="begin">
        <label for="learner-name">Piacere! Ops… come ti chiami?</label>
        <div class="intro-name-row">
          <input
            id="learner-name"
            v-model="learnerName"
            type="text"
            autocomplete="given-name"
            maxlength="40"
            placeholder="Il tuo nome, se ti va"
          />
          <button class="primary-button" type="submit">
            Cominciamo <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </main>

    <main v-else-if="screen === 'welcome'" class="welcome" aria-labelledby="welcome-heading">
      <span class="eyebrow">RIPRENDIAMO DA QUI</span>
      <h1 id="welcome-heading">
        {{ learnerName ? `Che bello rivederti, ${learnerName}.` : 'Che bello rivederti.' }}
      </h1>
      <p class="welcome-level">
        Livello <strong>{{ learning.learner.level }}</strong>
        <span aria-hidden="true">·</span> Grado
        <strong class="rank-numeral">{{ rankNumeral }}</strong>
      </p>
      <p>Una frase alla volta, al tuo ritmo.</p>
      <button class="primary-button" type="button" @click="startSession">
        Continuiamo <span aria-hidden="true">→</span>
      </button>
    </main>

    <main v-else-if="screen === 'practice'" class="practice" id="main-content">
      <aside
        class="history-indicator"
        :class="{ visible: historyIndicatorVisible || isReviewing }"
        aria-live="polite"
        :aria-label="`Frase ${displayedIndex + 1} di ${sessionItems.length} nella sessione`"
      >
        <span v-if="indicator.before" class="history-overflow">+{{ indicator.before }}</span>
        <button
          v-for="index in indicator.indexes"
          :key="index"
          type="button"
          class="history-dot"
          :class="{
            active: index === displayedIndex,
            correct: sessionItems[index]?.outcome === 'correct',
            incorrect:
              sessionItems[index]?.outcome === 'error' || sessionItems[index]?.outcome === 'typo',
          }"
          :aria-label="historyItemLabel(index)"
          :aria-current="index === displayedIndex ? 'step' : undefined"
          @click="reviewSessionItem(index)"
        ></button>
        <span v-if="indicator.after" class="history-overflow">+{{ indicator.after }}</span>
        <button
          v-if="reviewingFinishedSession"
          class="history-endpoint"
          type="button"
          aria-label="Torna al riepilogo della sessione"
          @click="returnToSummary"
        ></button>
      </aside>

      <div class="sentence-stage" :aria-busy="transitioning">
        <form
          class="exercise-form"
          :data-exercise-id="exercise.id"
          :class="{
            'answer-correct': outcome === 'correct',
            'answer-incorrect': outcome === 'error' || outcome === 'typo',
            'answer-bounce': (outcome === 'error' || outcome === 'typo') && !isReviewing,
          }"
          @submit.prevent="submit()"
        >
          <div class="sentence-window">
            <Transition
              name="sentence"
              @after-leave="createNextExercise"
              @after-enter="sentenceReady"
            >
              <div v-if="sentenceVisible" class="sentence-content">
                <label class="sr-only" for="verb-answer">
                  {{ exercise.before }}: completa con {{ verb.id }}. {{ exercise.after }}
                </label>
                <h1 class="sentence-text">
                  <span>{{ exercise.before }} </span>
                  <span class="answer-slot" :style="{ '--answer-width': answerWidth }">
                    <input
                      id="verb-answer"
                      ref="input"
                      :value="answer"
                      :readonly="isReviewing || !!outcome || transitioning"
                      :aria-invalid="outcome === 'error' || outcome === 'typo'"
                      :aria-describedby="outcome ? 'answer-feedback' : 'verb-hint'"
                      type="text"
                      autocomplete="off"
                      autocapitalize="none"
                      autocorrect="off"
                      :spellcheck="false"
                      enterkeyhint="go"
                      maxlength="32"
                      placeholder="···"
                      @input="updateAnswer"
                    />
                    <span id="verb-hint" class="infinitive">{{ verb.id }}</span>
                  </span>
                  <span> {{ exercise.after }}</span>
                </h1>
              </div>
            </Transition>
          </div>
          <div class="answer-actions">
            <button
              class="primary-button"
              :class="{ 'auto-advance': outcome && autoAdvanceActive && !isReviewing }"
              :style="{
                '--auto-advance-duration': `${autoAdvanceDuration}ms`,
              }"
              type="submit"
              :disabled="isReviewing || transitioning || (!answer.trim() && !outcome)"
            >
              <span>{{ outcome ? 'Prossima frase' : 'Verifica' }}</span>
              <svg v-if="outcome === 'correct'" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h15m-6-6 6 6-6 6" />
              </svg>
            </button>
          </div>
          <div class="practice-links">
            <button
              v-if="!outcome && !isReviewing"
              class="quiet-button dont-know"
              type="button"
              :disabled="transitioning"
              @click="submit(true)"
            >
              Non lo so ancora
            </button>
            <button
              v-else-if="autoAdvanceActive && !isReviewing"
              class="quiet-button stay-button"
              type="button"
              aria-label="Ferma il passaggio automatico alla prossima frase"
              @click="cancelAutoAdvance"
            >
              Resta qui
            </button>
            <span
              v-if="!isReviewing && (!outcome || autoAdvanceActive)"
              class="link-separator"
              aria-hidden="true"
              >·</span
            >
            <button class="quiet-button finish-button" type="button" @click="finish">
              Concludi la sessione
            </button>
          </div>
        </form>
      </div>

      <div class="feedback-region" aria-live="polite" aria-atomic="true">
        <section
          v-if="outcome"
          id="answer-feedback"
          class="feedback"
          :class="{ 'positive-feedback': outcome === 'correct' }"
          aria-label="Risultato"
        >
          <div class="feedback-intro">
            <span class="feedback-symbol" aria-hidden="true">{{
              outcome === 'correct' ? '✓' : '↺'
            }}</span>
            <h2>{{ feedbackHeading }}</h2>
          </div>
          <template v-if="outcome !== 'correct'">
            <p v-if="answer.trim()" class="answer-comparison">
              <span
                >Hai scritto <s>{{ answer }}</s></span
              >
              <span aria-hidden="true">→</span><strong>{{ exercise.answers[0] }}</strong>
            </p>
            <p v-else class="answer-comparison">
              La forma corretta è <strong>{{ exercise.answers[0] }}</strong
              >.
            </p>
            <p class="explanation">{{ exercise.explanation }}</p>
            <div v-if="showConjugation" id="conjugation-details">
              <ConjugationTable :verb="verb" :exercise="exercise" :answer="answer" />
              <button
                class="quiet-button hide-table-link"
                type="button"
                @click="setConjugationVisibility(false)"
              >
                Non mostrare più questa tabella
              </button>
            </div>
          </template>
          <p v-else class="correct-caption">Un’altra frase, un piccolo passo avanti.</p>
        </section>
      </div>
    </main>

    <main v-else class="summary" aria-labelledby="summary-heading">
      <aside
        v-if="stats.count"
        class="history-indicator summary-history visible"
        aria-label="Cronologia della sessione. Il riepilogo è selezionato."
      >
        <span v-if="indicator.before" class="history-overflow">+{{ indicator.before }}</span>
        <button
          v-for="index in indicator.indexes"
          :key="index"
          type="button"
          class="history-dot"
          :class="{
            correct: sessionItems[index]?.outcome === 'correct',
            incorrect:
              sessionItems[index]?.outcome === 'error' || sessionItems[index]?.outcome === 'typo',
          }"
          :aria-label="historyItemLabel(index)"
          @click="reviewSessionItem(index, true)"
        ></button>
        <span v-if="indicator.after" class="history-overflow">+{{ indicator.after }}</span>
        <span class="history-endpoint active" aria-hidden="true"></span>
      </aside>
      <span class="eyebrow">UN PICCOLO PASSO, OGNI GIORNO</span>
      <h1 id="summary-heading" tabindex="-1">
        {{
          stats.count
            ? learnerName
              ? `Un passo avanti, ${learnerName}.`
              : 'Un po’ meglio di prima.'
            : 'Ci vediamo alla prossima.'
        }}
      </h1>
      <p>
        {{
          stats.count
            ? 'Hai dedicato un momento al tuo italiano. Ecco com’è andata.'
            : 'Basta una frase per cominciare. Quando vuoi, siamo qui.'
        }}
      </p>
      <ProgressJourney
        v-if="stats.count"
        :start-position="sessionStartPosition"
        :end-position="progressPosition"
        :start-level="sessionStartLevel"
        :end-level="learning.learner.level"
        :revisit="summaryRevisited"
      />
      <hr v-if="stats.count" class="summary-seam" aria-hidden="true" />
      <SessionSummaryStats
        v-if="stats.count"
        :accuracy="stats.accuracy"
        :count="stats.count"
        :revisit="summaryRevisited"
      />
      <section v-if="mistakes.length" class="review-note">
        <h2>Da ritrovare, con calma</h2>
        <p>{{ mistakes.join(' · ') }}</p>
        <span>Questi verbi torneranno durante la pratica.</span>
      </section>
    </main>

    <SettingsDialog
      ref="settings"
      :name="learnerName"
      :show-conjugation="showConjugation"
      @update:name="setName"
      @update:show-conjugation="setConjugationVisibility"
      @reset-progress="resetProgress"
      @open-privacy="openPrivacy"
      @closed="settingsTrigger?.focus()"
    />
    <InformationDialog ref="information" @closed="informationTrigger?.focus()" />
  </div>
</template>
