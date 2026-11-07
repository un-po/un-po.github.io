<script setup lang="ts">
import { computed } from 'vue';
import { feedbackRows, nextUnlockEstimate } from '../lib/feedback.ts';
import AccuracyValue from './AccuracyValue.vue';
import type { LearningState } from '../lib/learning.ts';
import { persons, tenseLabels, type Exercise, type Verb } from '../lib/practice.ts';
const props = defineProps<{
  state: LearningState;
  animate?: boolean;
  baseline: LearningState['results'];
  exercises: Exercise[];
  verbs: Verb[];
}>();
const rows = computed(() => feedbackRows(props.state.results, props.exercises, props.verbs));
const previous = computed(() => feedbackRows(props.baseline, props.exercises, props.verbs));
const labels = [
  ...persons.map((person) => person[0]!.toUpperCase() + person.slice(1)),
  'Regolari',
  'Irregolari',
];
const unlocked = (tense: string) =>
  props.state.curriculum.unlocked.some((id) => id.startsWith(`${tense}:`));
const estimate = computed(() => nextUnlockEstimate(props.state, props.exercises));
const unknown = computed(
  () =>
    Object.entries(props.state.results).filter(
      ([id, result]) => !result.tense && props.exercises.some((e) => e.id === id),
    ).length,
);
</script>
<template>
  <section class="learning-feedback" aria-label="I tuoi progressi">
    <div
      class="accuracy-scroll"
      role="region"
      aria-label="Accuratezza per tempo, persona e regolarità"
      tabindex="0"
    >
      <table class="accuracy-matrix">
        <caption class="sr-only">
          Accuratezza salvata. Un punto indica che non ci sono ancora risposte; un lucchetto indica
          un tempo da sbloccare.
        </caption>
        <thead>
          <tr>
            <th scope="col">Tempo</th>
            <th
              v-for="(label, index) in labels"
              :key="label"
              scope="col"
              :class="{ 'regularity-start': index === 6 }"
            >
              {{ label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="row.tense">
            <th scope="row">{{ tenseLabels[row.tense] }}</th>
            <td
              v-for="(cell, index) in row.cells"
              :key="index"
              :class="{ 'regularity-start': index === 6 }"
            >
              <svg
                v-if="!unlocked(row.tense)"
                class="accuracy-lock"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Da sbloccare"
              >
                <rect x="6" y="10" width="12" height="10" rx="2" />
                <path d="M9 10V7a3 3 0 0 1 6 0v3" />
              </svg>
              <span
                v-else-if="!cell.covered"
                class="empty-cell"
                role="img"
                aria-label="Nessuna risposta"
              ></span>
              <AccuracyValue
                v-else
                :before="previous[rowIndex]!.cells[index]!"
                :row-index="rowIndex"
                :after="cell"
                :animate="animate !== false"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="matrix-scroll-hint">Scorri la tabella per vedere tutte le colonne.</p>
    <p v-if="unknown" class="feedback-key">
      {{ unknown }}
      {{ unknown === 1 ? 'risposta da rivedere in una frase' : 'risposte da rivedere in frasi' }}
      con più tempi possibili: il tempo non è stato attribuito.
    </p>
    <div class="band-feedback" aria-live="polite">
      <p v-if="estimate && estimate.maximum === 0" class="unlock-estimate">
        Il prossimo passo è pronto per aprirsi: {{ tenseLabels[estimate.target.tense] }}.
      </p>
      <template v-else-if="estimate">
        <p class="unlock-estimate">
          Ancora
          <strong>{{
            estimate.minimum === estimate.maximum
              ? estimate.minimum
              : `${estimate.minimum}–${estimate.maximum}`
          }}</strong>
          frasi da risolvere per sbloccare
          <strong
            >{{ tenseLabels[estimate.target.tense]
            }}<template v-if="unlocked(estimate.target.tense)">
              · parte {{ estimate.target.part }}</template
            ></strong
          >.
        </p>
      </template>
      <p v-else class="unlock-estimate">
        Tutti i tempi sono disponibili. Un po’ di pratica, ogni giorno.
      </p>
    </div>
  </section>
</template>
<style scoped>
.learning-feedback {
  margin: 34px auto;
  width: min(100%, 1000px);
  text-align: left;
}
.feedback-key,
.band-feedback {
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
}
.feedback-key {
  text-align: center;
}
.accuracy-scroll {
  max-width: 100%;
  overflow-x: auto;
  padding-block: 8px;
}
.accuracy-matrix {
  --accuracy-row-height: 64px;
  width: 100%;
  min-width: 660px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.accuracy-matrix th,
.accuracy-matrix td {
  width: auto;
  padding: 15px 6px;
  white-space: nowrap;
}
.accuracy-matrix tbody tr {
  height: var(--accuracy-row-height);
}
.accuracy-matrix tbody td {
  padding-block: 0;
  vertical-align: middle;
}
.accuracy-matrix td,
.accuracy-matrix thead th:not(:first-child) {
  text-align: center;
}
.accuracy-matrix tbody th {
  min-width: 130px;
  padding-right: 28px;
  color: var(--ink);
}
.accuracy-matrix .regularity-start {
  padding-left: 32px;
}
.accuracy-lock {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: var(--faint);
  stroke-width: 1.6;
}
.empty-cell {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--faint);
  opacity: 0.6;
  vertical-align: middle;
}
.accuracy-matrix thead th {
  font-family: var(--hand);
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
}
.unlock-estimate {
  text-align: center;
  font-size: 15px;
  line-height: 1.8;
}
.unlock-estimate strong {
  color: var(--ink);
  font-weight: 500;
}

.matrix-scroll-hint {
  display: none;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}
@media (max-width: 700px) {
  .matrix-scroll-hint {
    display: block;
  }
}
.band-feedback {
  max-width: 650px;
  margin: 22px auto 0;
}
</style>
