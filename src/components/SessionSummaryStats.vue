<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  accuracy: number;
  count: number;
  revisit: boolean;
}>();

const revealDistance = 140;
const revealDuration = 1700;
const animated = ref(props.revisit);
let firstFrame = 0;
let secondFrame = 0;

const style = {
  '--stats-reveal-distance': `${revealDistance}px`,
  '--stats-reveal-duration': `${revealDuration}ms`,
};

onMounted(() => {
  if (props.revisit) return;
  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      animated.value = true;
    });
  });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(firstFrame);
  cancelAnimationFrame(secondFrame);
});
</script>

<template>
  <div class="summary-stats-clip">
    <div
      class="summary-stats"
      :class="{ animated, revisit }"
      :style="style"
      role="group"
      aria-label="Risultati della sessione"
    >
      <div>
        <strong>{{ props.accuracy }}<small>%</small></strong>
        <span>corrette al primo tentativo</span>
      </div>
      <div>
        <strong>{{ props.count }}</strong>
        <span>frasi completate</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-stats-clip {
  overflow: hidden;
}
.summary-stats {
  opacity: 0;
  transform: translateY(calc(0px - var(--stats-reveal-distance)));
}
.summary-stats.animated {
  animation: reveal-from-seam var(--stats-reveal-duration) cubic-bezier(0.2, 0.72, 0.22, 1) forwards;
}
.summary-stats.revisit {
  animation: none;
  opacity: 1;
  transform: none;
}
@keyframes reveal-from-seam {
  from {
    opacity: 0;
    transform: translateY(calc(0px - var(--stats-reveal-distance)));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .summary-stats.animated {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
