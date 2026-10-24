<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import ThemeToggle from './components/ThemeToggle.vue';
import ConjugationTable from './components/ConjugationTable.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import InformationDialog from './components/InformationDialog.vue';
import rawVerbs from './content/verbs.json';
import rawExercises from './content/exercises.json';
import { gradeAnswer, nextExercise, normalize, summarize } from './lib/practice.ts';
import type { Attempt, Exercise, Outcome, Verb } from './lib/practice.ts';
import { clearHistory, loadHistory, saveHistory } from './lib/storage.ts';
import { loadProfile, saveProfile } from './lib/profile.ts';
import { loadTableVisibility, saveTableVisibility } from './lib/preferences.ts';
import { trackEvent } from './lib/analytics.ts';

interface SessionItem {
  exercise: Exercise;
  answer: string;
  outcome: Outcome | null;
}

const verbs = rawVerbs as Verb[];
const exercises = rawExercises as Exercise[];
const profile = loadProfile();
const learnerName = ref(profile.name);
const history = ref<Attempt[]>(loadHistory());
const attempts = ref<Attempt[]>([]);
const showConjugation = ref(loadTableVisibility());
const firstExercise = nextExercise(exercises, history.value);
const sessionItems = ref<SessionItem[]>([{ exercise: firstExercise, answer: '', outcome: null }]);
const displayedIndex = ref(0);
const screen = ref<'intro' | 'practice' | 'summary'>(profile.introduced ? 'practice' : 'intro');
const transitioning = ref(false);
const sentenceVisible = ref(true);
const input = ref<HTMLInputElement>();
const settings = ref<InstanceType<typeof SettingsDialog>>();
const information = ref<InstanceType<typeof InformationDialog>>();
const settingsTrigger = ref<HTMLButtonElement>();
const informationTrigger = ref<HTMLButtonElement>();
const storageAvailable = ref(true);
const historyIndicatorVisible = ref(false);
let indicatorTimer: ReturnType<typeof setTimeout> | undefined;

const currentIndex = computed(() => sessionItems.value.length - 1);
const displayedItem = computed(() => sessionItems.value[displayedIndex.value]!);
const exercise = computed(() => displayedItem.value.exercise);
const answer = computed(() => displayedItem.value.answer);
const outcome = computed(() => displayedItem.value.outcome);
const verb = computed(() => verbs.find((item) => item.id === exercise.value.verb)!);
const isReviewing = computed(() => displayedIndex.value !== currentIndex.value);
const stats = computed(() => summarize(attempts.value));
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
const indicator = computed(() => {
  const total = sessionItems.value.length;
  const size = Math.min(20, total);
  const maxStart = Math.max(0, total - size);
  const start = Math.max(0, Math.min(displayedIndex.value - Math.floor(size / 2), maxStart));
  return {
    before: start,
    after: total - (start + size),
    indexes: Array.from({ length: size }, (_, offset) => start + offset),
  };
});

function begin() {
  learnerName.value = learnerName.value.trim().slice(0, 40);
  storageAvailable.value = saveProfile(learnerName.value);
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
  history.value.push(attempt);
  storageAvailable.value = saveHistory(history.value);
}

function advance() {
  if (transitioning.value || isReviewing.value || !outcome.value) return;
  transitioning.value = true;
  sentenceVisible.value = false;
}

function createNextExercise() {
  if (!transitioning.value) return;
  const next = nextExercise(exercises, history.value);
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
  if (screen.value !== 'practice' || transitioning.value) return;
  const target = Math.max(0, Math.min(currentIndex.value, displayedIndex.value + direction));
  if (target === displayedIndex.value) return;
  displayedIndex.value = target;
  showIndicator();
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
  trackEvent('session_completed');
  transitioning.value = false;
  sentenceVisible.value = true;
  historyIndicatorVisible.value = false;
  screen.value = 'summary';
  nextTick(() => document.getElementById('summary-heading')?.focus());
}

function returnToCurrentExercise() {
  if (screen.value === 'intro') return;
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
  showConjugation.value = value;
  saveTableVisibility(value);
}

function resetProgress() {
  storageAvailable.value = clearHistory();
  if (!storageAvailable.value) {
    window.alert('Il browser non permette di cancellare i progressi salvati.');
    return;
  }
  history.value = [];
  attempts.value = [];
  const next = nextExercise(exercises, []);
  sessionItems.value = [{ exercise: next, answer: '', outcome: null }];
  displayedIndex.value = 0;
  screen.value = 'practice';
  settings.value?.close();
  focusAnswer();
}

function openPrivacy() {
  nextTick(() => information.value?.open('privacy'));
}

onMounted(() => {
  window.addEventListener('keydown', handleSessionKeys);
  if (screen.value === 'practice') trackEvent('session_started');
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSessionKeys);
  clearTimeout(indicatorTimer);
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
          @click="information?.open()"
        >
          Il resto
        </button>
        <span class="nav-divider" aria-hidden="true"></span>
        <button
          ref="settingsTrigger"
          class="icon-button"
          type="button"
          aria-label="Apri le impostazioni"
          @click="settings?.open()"
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
          della sessione. Se sbagli, guardiamo insieme la coniugazione. Nessuna fretta.
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

    <main v-else-if="screen === 'practice'" class="practice" id="main-content">
      <aside
        class="history-indicator"
        :class="{ visible: historyIndicatorVisible || isReviewing }"
        aria-live="polite"
        :aria-label="`Frase ${displayedIndex + 1} di ${sessionItems.length} nella sessione`"
      >
        <span v-if="indicator.before" class="history-overflow">+{{ indicator.before }}</span>
        <span
          v-for="index in indicator.indexes"
          :key="index"
          class="history-dot"
          :class="{
            active: index === displayedIndex,
            correct: sessionItems[index]?.outcome === 'correct',
            incorrect:
              sessionItems[index]?.outcome === 'error' || sessionItems[index]?.outcome === 'typo',
          }"
          aria-hidden="true"
        ></span>
        <span v-if="indicator.after" class="history-overflow">+{{ indicator.after }}</span>
      </aside>

      <div class="sentence-stage" :aria-busy="transitioning">
        <form
          class="exercise-form"
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
              type="submit"
              :disabled="isReviewing || transitioning || (!answer.trim() && !outcome)"
            >
              {{ outcome ? 'Prossima frase' : 'Verifica' }}
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
            <span v-if="!outcome && !isReviewing" class="link-separator" aria-hidden="true">·</span>
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
      <div v-if="stats.count" class="summary-stats">
        <div>
          <strong>{{ stats.accuracy }}<small>%</small></strong>
          <span>corrette al primo tentativo</span>
        </div>
        <div>
          <strong>{{ stats.count }}</strong>
          <span>frasi completate</span>
        </div>
      </div>
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
