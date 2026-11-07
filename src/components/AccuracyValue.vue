<script setup lang="ts">
import { computed } from 'vue';
import { accuracyChange, type AccuracyCell } from '../lib/feedback.ts';
const props = withDefaults(
  defineProps<{
    before: AccuracyCell;
    after: AccuracyCell;
    animate?: boolean;
    rowIndex?: number;
  }>(),
  { animate: true, rowIndex: 0 },
);
const format = (cell: AccuracyCell) => `${Math.round((100 * cell.correct) / cell.covered)}%`;
const current = computed(() => format(props.after));
const direction = computed(() => accuracyChange(props.before, props.after));
const title = computed(
  () =>
    `${props.after.correct} corrette su ${props.after.covered} frasi; prima della sessione: ${props.before.covered ? format(props.before) : 'nessun dato'}`,
);
const timing = computed(() => ({
  '--reveal-delay': `${440 + props.rowIndex * 440}ms`,
  '--reveal-duration': `${1760 + props.rowIndex * 160}ms`,
}));
</script>
<template>
  <span class="accuracy-window" :title="title" :style="timing">
    <span class="accuracy-seam">
      <span
        class="accuracy-value"
        :class="{ animated: animate, rising: direction > 0, falling: direction < 0 }"
      >
        <span>{{ current }}</span>
        <span class="direction-slot">
          <span
            v-if="direction"
            :class="direction > 0 ? 'accuracy-up' : 'accuracy-down'"
            :aria-label="
              direction > 0
                ? 'In aumento rispetto all’inizio della sessione'
                : 'In diminuzione rispetto all’inizio della sessione'
            "
            >{{ direction > 0 ? '↑' : '↓' }}</span
          >
        </span>
      </span>
    </span>
  </span>
</template>
<style scoped>
.accuracy-window {
  display: flex;
  align-items: center;
  width: max-content;
  height: calc(var(--accuracy-row-height, 64px) - 1px);
  margin-inline: auto;
}
.accuracy-seam {
  display: flex;
  align-items: center;
  height: 100%;
  overflow: hidden;
}
.accuracy-value {
  display: inline-flex;
  height: 100%;
  align-items: center;
  justify-content: flex-end;
  min-width: 4.6em;
  font: 400 15px/1.6 var(--hand);
  font-variant-numeric: tabular-nums;
}
.direction-slot {
  display: inline-block;
  width: 1em;
  margin-left: 3px;
  font-size: 15px;
  font-weight: 600;
}
.accuracy-up {
  color: var(--result-correct);
}
.accuracy-down {
  color: var(--result-wrong);
}
.animated {
  animation: value-fade var(--reveal-duration) ease-out var(--reveal-delay) both;
}
.animated.rising {
  animation-name: value-rise;
  animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
}
.animated.falling {
  animation-name: value-fall;
  animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
}
@keyframes value-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes value-rise {
  from {
    opacity: 1;
    transform: translateY(115%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes value-fall {
  from {
    opacity: 1;
    transform: translateY(-115%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .animated {
    animation: none;
  }
}
</style>
