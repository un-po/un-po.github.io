<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  curriculumBands,
  activeBands,
  bandProgress,
  synchronizeLearningState,
  type LearningState,
} from '../lib/learning.ts';
import { learningStorageKey } from '../lib/storage.ts';
import { gradeExercise, type Exercise, type Outcome, type Verb } from '../lib/practice.ts';

const { exercises, verbs, currentExercise, submitAnswer, canReplay, replayAnimation } =
  defineProps<{
    exercises: Exercise[];
    verbs: Verb[];
    currentExercise: () => Exercise | null;
    submitAnswer: (value: string) => void;
    canReplay: () => boolean;
    replayAnimation: () => void;
  }>();
const answerable = ref(false);
const replayable = ref(false);
function answerAndConfirm(outcome: Outcome) {
  error.value = '';
  const exercise = currentExercise();
  if (!exercise) return;
  let answer = outcome === 'correct' ? exercise.answers[0]! : 'risposta sbagliata';
  if (outcome === 'typo') {
    let found: string | undefined;
    for (const target of exercise.answers) {
      for (let index = 0; index < target.length && !found; index++) {
        for (const candidate of [
          target.slice(0, index) + 'x' + target.slice(index + 1),
          target.slice(0, index) + target.slice(index + 1),
        ]) {
          if (gradeExercise(candidate, exercise, verbs).outcome === 'typo') {
            found = candidate;
            break;
          }
        }
      }
      if (found) break;
    }
    if (!found) {
      error.value =
        'Questa forma non ammette un refuso con le regole attuali. Prova un’altra frase.';
      return;
    }
    answer = found;
  }
  if (gradeExercise(answer, exercise, verbs).outcome !== outcome) {
    error.value = 'Impossibile generare questo risultato per la frase corrente.';
    return;
  }
  submitAnswer(answer);
  answerable.value = false;
}
const tenseLabels = {
  presente: 'Presente indicativo',
  passato_prossimo: 'Passato prossimo',
  imperfetto: 'Imperfetto',
  futuro_semplice: 'Futuro semplice',
};
type Tense = keyof typeof tenseLabels;

const backupKey = 'unpo-testing-backup';
const open = ref(false);
const state = ref<LearningState>();
const error = ref('');
const hasBackup = ref(false);
const bandCount = ref(3);
const tense = ref<Tense>('presente');
const question = ref('');
const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const candidates = computed(() =>
  exercises.filter((exercise) => (exercise.tense ?? 'presente') === tense.value),
);
function refresh() {
  answerable.value = currentExercise() !== null;
  replayable.value = canReplay();
  try {
    state.value = JSON.parse(localStorage.getItem(learningStorageKey) ?? 'null') ?? undefined;
    hasBackup.value = localStorage.getItem(backupKey) !== null;
  } catch {
    error.value = 'Impossibile leggere i dati locali.';
  }
}
refresh();
bandCount.value = state.value?.curriculum?.unlocked.length ?? 3;
const timer = setInterval(refresh, 1000);
onBeforeUnmount(() => clearInterval(timer));
const summary = computed(() => {
  const s = state.value;
  if (!s) return null;
  return {
    versione: s.version,
    contenuto: 'contentRevision' in s ? s.contentRevision : 'precedente',
    fasceSbloccate: s.curriculum.unlocked,
    fasceAttive: activeBands(s, exercises).map((band) => ({
      id: band.id,
      ...bandProgress(band, s.results),
    })),
    risposteDistinte: Object.keys(s.results).length,
    coda: s.queue.length,
    prossime: s.queue.slice(0, 8).map((id) => ({ id, tempo: byId.get(id)?.tense })),
    padronanza: Object.values(s.mastery).reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {}),
    contesti: Object.fromEntries(
      Object.entries(s.contexts).map(([key, values]) => [key, Object.keys(values).length]),
    ),
    tempi: s.contexts.tenses,
  };
});
function inject(useTense: boolean) {
  try {
    const saved = localStorage.getItem(learningStorageKey);
    if (!saved) throw new Error('Nessun progresso disponibile.');
    const next: LearningState = JSON.parse(saved);
    if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, saved);
    const selected = useTense
      ? candidates.value.find((item) => item.id === question.value)
      : undefined;
    const bands = curriculumBands(exercises);
    const selectedBand = selected
      ? `${selected.tense ?? 'presente'}:${selected.band ?? 1}`
      : `${tense.value}:2`;
    const count = useTense
      ? Math.max(3, bands.findIndex((band) => band.id === selectedBand) + 1)
      : Math.max(3, Math.min(8, Math.round(bandCount.value || 3)));
    next.curriculum.unlocked = bands.slice(0, count).map((band) => band.id);
    synchronizeLearningState(next, exercises);
    if (useTense) {
      next.queue.sort(
        (a, b) =>
          Number((byId.get(b)?.tense ?? 'presente') === tense.value) -
          Number((byId.get(a)?.tense ?? 'presente') === tense.value),
      );
      if (selected) next.queue = [selected.id, ...next.queue.filter((id) => id !== selected.id)];
    }
    localStorage.setItem(learningStorageKey, JSON.stringify(next));
    location.reload();
  } catch (cause) {
    error.value = String(cause);
  }
}
function restore() {
  try {
    const backup = localStorage.getItem(backupKey);
    if (!backup) return;
    localStorage.setItem(learningStorageKey, backup);
    localStorage.removeItem(backupKey);
    location.reload();
  } catch (cause) {
    error.value = String(cause);
  }
}
</script>

<template>
  <aside class="dev-tools" :class="{ 'is-open': open }" aria-label="Strumenti di sviluppo">
    <button type="button" :aria-expanded="open" @click="open = !open">
      {{ open ? 'Chiudi strumenti' : 'Sviluppo' }}
    </button>
    <section v-if="open">
      <h2>Banco di prova</h2>
      <p>
        Le modifiche ricaricano la pagina e chiudono la sessione. Il primo intervento salva una
        copia dei progressi.
      </p>
      <div role="group" aria-label="Rispondi e verifica">
        <button type="button" :disabled="!answerable" @click="answerAndConfirm('correct')">
          Corretta ✓
        </button>
        <button type="button" :disabled="!answerable" @click="answerAndConfirm('typo')">
          Refuso ≈
        </button>
        <button type="button" :disabled="!answerable" @click="answerAndConfirm('error')">
          Sbagliata ×
        </button>
      </div>
      <button type="button" :disabled="!replayable" @click="replayAnimation">
        Ripeti animazione del riepilogo
      </button>
      <label
        >Tempo
        <select aria-label="Tempo" v-model="tense" @change="question = ''">
          <option v-for="(label, key) in tenseLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
      <label
        >Frase
        <select aria-label="Frase" v-model="question">
          <option value="">Una frase del tempo scelto</option>
          <option v-for="item in candidates" :key="item.id" :value="item.id">
            {{ item.id }} — {{ item.before }}…{{ item.after }}
          </option>
        </select>
      </label>
      <button type="button" @click="inject(true)">Prova questo tempo / frase</button>
      <label
        >Fasce sbloccate <input v-model.number="bandCount" type="number" min="3" max="8"
      /></label>
      <button type="button" @click="inject(false)">Imposta fasce</button>
      <button type="button" :disabled="!hasBackup" @click="restore">
        Ripristina progressi originali
      </button>
      <p v-if="error" role="alert">{{ error }}</p>
      <details open>
        <summary>Riepilogo del salvataggio</summary>
        <pre>{{ JSON.stringify(summary, null, 2) }}</pre>
      </details>
      <details>
        <summary>Dati completi dei progressi</summary>
        <pre>{{ JSON.stringify(state, null, 2) }}</pre>
      </details>
    </section>
  </aside>
</template>

<style scoped>
.dev-tools {
  position: fixed;
  bottom: 12px;
  left: 12px;
  z-index: 100;
  font:
    13px/1.5 system-ui,
    sans-serif;
  color: var(--ink);
}
section {
  width: 100%;
  padding: 18px;
  margin-top: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: none;
}
h2 {
  margin: 0;
  font-size: 18px;
}
label {
  display: block;
  margin: 12px 0;
}
select,
input {
  display: block;
  width: 100%;
  padding: 6px;
  background: var(--canvas);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 5px;
}
button {
  padding: 7px 10px;
  margin: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 11px;
}
details {
  margin-top: 14px;
}
</style>

<style>
/* Loaded only by the development-only dynamic import. */
body:has(.dev-tools.is-open) #app {
  margin-left: min(360px, 32vw);
  width: calc(100% - min(360px, 32vw));
}
.dev-tools.is-open {
  position: fixed;
  inset: 0 auto 0 0;
  width: min(360px, 32vw);
  height: 100dvh;
  overflow-y: auto;
  padding: 12px;
  background: var(--surface);
  border-right: 1px solid var(--line);
}
@media (max-width: 999px) {
  body:has(.dev-tools.is-open) #app {
    margin-left: 0;
    width: 100%;
  }
  .dev-tools.is-open {
    position: relative;
    inset: auto;
    width: 100%;
    height: auto;
    max-height: 45dvh;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
}
</style>
