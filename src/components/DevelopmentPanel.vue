<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { synchronizeLearningState, type LearningState } from '../lib/learning.ts';
import { learningStorageKey } from '../lib/storage.ts';
import type { Exercise } from '../lib/practice.ts';

const { exercises } = defineProps<{ exercises: Exercise[] }>();
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
const level = ref(1);
const tense = ref<Tense>('presente');
const question = ref('');
const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const candidates = computed(() =>
  exercises.filter((exercise) => (exercise.tense ?? 'presente') === tense.value),
);
function refresh() {
  try {
    state.value = JSON.parse(localStorage.getItem(learningStorageKey) ?? 'null') ?? undefined;
    hasBackup.value = localStorage.getItem(backupKey) !== null;
  } catch {
    error.value = 'Impossibile leggere i dati locali.';
  }
}
refresh();
level.value = state.value?.learner.level ?? 1;
const timer = setInterval(refresh, 1000);
onBeforeUnmount(() => clearInterval(timer));
const summary = computed(() => {
  const s = state.value;
  if (!s) return null;
  return {
    versione: s.version,
    contenuto: 'contentRevision' in s ? s.contentRevision : 'precedente',
    ...s.learner,
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
    next.learner.level =
      (selected ? (selected.level ?? selected.difficulty) : undefined) ??
      (useTense
        ? { presente: 4, passato_prossimo: 9, imperfetto: 14, futuro_semplice: 19 }[tense.value]
        : Math.max(1, Math.min(25, Math.round(level.value || 1))));
    next.learner.levelProgress = 0;
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
  <aside class="dev-tools" aria-label="Strumenti di sviluppo">
    <button type="button" :aria-expanded="open" @click="open = !open">
      {{ open ? 'Chiudi strumenti' : 'Sviluppo' }}
    </button>
    <section v-if="open">
      <h2>Banco di prova</h2>
      <p>
        Le modifiche ricaricano la pagina e chiudono la sessione. Il primo intervento salva una
        copia dei progressi.
      </p>
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
      <label>Livello <input v-model.number="level" type="number" min="1" max="25" /></label>
      <button type="button" @click="inject(false)">Imposta livello</button>
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
  width: min(440px, calc(100vw - 24px));
  max-height: 75vh;
  overflow: auto;
  padding: 18px;
  margin-top: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 8px 32px #0002;
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
