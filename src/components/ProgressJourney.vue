<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  startPosition: number;
  endPosition: number;
  startLevel: number;
  endLevel: number;
  revisit: boolean;
}>();

const step = 88;
const levels = Array.from({ length: 25 }, (_, index) => index + 1);
const ranks = [
  { numeral: 'I', start: 1 },
  { numeral: 'II', start: 6 },
  { numeral: 'III', start: 11 },
  { numeral: 'IV', start: 16 },
  { numeral: 'V', start: 21 },
];
const distance = computed(() => Math.max(0, props.endPosition - props.startPosition));
const madeProgress = computed(() => distance.value > 0.001);
const moving = computed(() => distance.value > 0.001);
const revealDuration = 1700;
const revealDistance = 140;
const journeyDelay = 900;
const journeyDuration = computed(() => Math.min(4400, Math.max(650, distance.value * 2400)));
const arrivalDelay = computed(() => journeyDelay + journeyDuration.value);
const trackWidth = `${24 * step + 1}px`;
const animated = ref(props.revisit);
const celebrating = ref(false);
let firstFrame = 0;
let secondFrame = 0;

const journeyStyle = computed(() => ({
  '--track-start': `${props.startPosition * step}px`,
  '--track-end': `${props.endPosition * step}px`,
  '--journey-width': `${distance.value * step}px`,
  '--reveal-duration': `${revealDuration}ms`,
  '--reveal-distance': `${revealDistance}px`,
  '--journey-delay': `${journeyDelay}ms`,
  '--journey-duration': `${journeyDuration.value}ms`,
  '--arrival-delay': `${arrivalDelay.value}ms`,
  '--halo-delay': `${arrivalDelay.value + 160}ms`,
}));

const ariaLabel = computed(() => {
  if (!madeProgress.value) {
    return `La sessione si conclude al livello ${props.endLevel}, consolidando il percorso.`;
  }
  if (props.startLevel === props.endLevel) {
    return `Progresso della sessione all’interno del livello ${props.endLevel}.`;
  }
  return `Progresso della sessione: dal livello ${props.startLevel} al livello ${props.endLevel}.`;
});

onMounted(() => {
  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      if (props.revisit) celebrating.value = true;
      else animated.value = true;
    });
  });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(firstFrame);
  cancelAnimationFrame(secondFrame);
});
</script>

<template>
  <section
    class="progress-journey"
    :class="{ moving, animated, revisit, celebrating }"
    :style="journeyStyle"
  >
    <div class="journey-reveal-clip">
      <div class="journey-reveal" :class="{ animated, revisit: props.revisit }">
        <h2>{{ madeProgress ? 'Un po’ più avanti.' : 'Oggi hai consolidato il percorso.' }}</h2>
        <div class="progress-window" role="img" :aria-label="ariaLabel">
          <div class="progress-strip" :class="{ animated }" :style="{ width: trackWidth }">
            <span class="progress-line" aria-hidden="true"></span>
            <span class="session-start-marker" aria-hidden="true"></span>
            <span
              v-for="rank in ranks"
              :key="rank.numeral"
              class="rank-marker"
              :class="{ final: rank.numeral === 'V' }"
              :style="{ left: `${(rank.start - 1) * step}px` }"
              aria-hidden="true"
            >
              <small v-if="rank.numeral === 'V'">Italiano vero</small>
              <small v-else>grado</small>
              <b>{{ rank.numeral }}</b>
            </span>
            <span
              v-for="level in levels"
              :key="level"
              class="level-mark"
              :class="{ major: level % 5 === 0 }"
              :style="{ left: `${(level - 1) * step}px` }"
              aria-hidden="true"
            >
              <i></i><b>{{ level }}</b>
            </span>
          </div>
          <span class="journey-line" aria-hidden="true"></span>
          <span class="current-progress-marker" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.progress-journey {
  width: min(680px, calc(100% - 16px));
  margin: 26px auto 0;
}
.journey-reveal-clip {
  overflow: hidden;
}
.journey-reveal {
  opacity: 0;
  transform: translateY(var(--reveal-distance));
}
.journey-reveal.animated {
  animation: reveal-from-below var(--reveal-duration) cubic-bezier(0.2, 0.72, 0.22, 1) forwards;
}
.journey-reveal.revisit {
  opacity: 1;
  transform: none;
}
.progress-journey h2 {
  margin: 0 0 18px;
  font:
    400 16px/1.6 'Playwrite IT Trad',
    var(--hand);
  color: var(--ink);
}
.progress-window {
  position: relative;
  height: 122px;
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 9%, #000 91%, transparent);
}
.progress-strip {
  position: absolute;
  height: 122px;
  left: 50%;
  top: 0;
  transform: translateX(calc(0px - var(--track-start)));
}
.progress-strip.animated {
  transform: translateX(calc(0px - var(--track-end)));
  transition: transform var(--journey-duration) cubic-bezier(0.45, 0.05, 0.55, 0.95)
    var(--journey-delay);
}
.progress-journey:not(.moving) .progress-strip.animated {
  transition: none;
}
.progress-line {
  position: absolute;
  top: 61px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--line);
}
.journey-line {
  position: absolute;
  z-index: 1;
  top: 61px;
  right: calc(50% + 6px);
  width: max(0px, calc(var(--journey-width) - 12px));
  height: 2px;
  background: var(--accent);
  opacity: 0;
  transform: scaleX(0);
  transform-origin: right center;
}
.progress-journey.moving.animated .journey-line {
  animation: tracking-line-arrives var(--journey-duration) cubic-bezier(0.45, 0.05, 0.55, 0.95)
    var(--journey-delay) forwards;
}
.session-start-marker,
.current-progress-marker {
  position: absolute;
  z-index: 2;
  width: 12px;
  height: 12px;
  top: 56px;
  border-radius: 50%;
  transform: translateX(-50%);
}
.session-start-marker {
  left: var(--track-start);
  border: 2px solid var(--accent);
  background: var(--canvas);
  opacity: 0;
}
.progress-journey.animated:not(.revisit) .session-start-marker {
  animation: origin-fade var(--reveal-duration) ease-out forwards;
}
.current-progress-marker {
  left: 50%;
  background: var(--accent);
}
.current-progress-marker::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 1.5px solid var(--accent);
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.2);
}
.progress-journey.moving.animated .current-progress-marker {
  opacity: 0;
  animation: dot-from-line 720ms cubic-bezier(0.16, 0.85, 0.24, 1.18) var(--arrival-delay) forwards;
}
.progress-journey.moving.animated .current-progress-marker::after {
  animation: arrival-halo 1000ms cubic-bezier(0.12, 0.72, 0.2, 1) var(--halo-delay) forwards;
}
.progress-journey:not(.moving).animated .current-progress-marker {
  animation: quiet-pulse 900ms ease-out var(--arrival-delay) both;
}
.progress-journey:not(.moving).animated .current-progress-marker::after {
  animation: arrival-halo 1000ms cubic-bezier(0.12, 0.72, 0.2, 1) var(--halo-delay) forwards;
}
.level-mark,
.rank-marker {
  position: absolute;
  transform: translateX(-50%);
  text-align: center;
  white-space: nowrap;
}
.level-mark {
  top: 52px;
  color: var(--muted);
}
.level-mark i {
  display: block;
  width: 1px;
  height: 18px;
  margin: 0 auto 7px;
  background: var(--line);
}
.level-mark.major i {
  width: 3px;
  border-radius: 2px;
}
.level-mark b {
  font: 500 15px/1 var(--hand);
}
.rank-marker {
  top: 2px;
  color: var(--faint);
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.rank-marker b {
  font:
    400 15px/1 'Times New Roman',
    Times,
    serif;
  letter-spacing: 0.1em;
}
.rank-marker small {
  font:
    10px/1.2 -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.rank-marker.final {
  color: var(--accent);
}
@keyframes reveal-from-below {
  from {
    opacity: 0;
    transform: translateY(var(--reveal-distance));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes origin-fade {
  to {
    opacity: 1;
  }
}
@keyframes tracking-line-arrives {
  from {
    opacity: 0;
    transform: scaleX(0);
  }
  to {
    opacity: 0.7;
    transform: scaleX(1);
  }
}
@keyframes dot-from-line {
  0% {
    opacity: 1;
    transform: translateX(-50%) scale(0.04);
  }
  68% {
    opacity: 1;
    transform: translateX(-50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}
@keyframes arrival-halo {
  0% {
    opacity: 0.58;
    transform: translate(-50%, -50%) scale(0.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(5);
  }
}
@keyframes quiet-pulse {
  0% {
    transform: translateX(-50%) scale(0.04);
    opacity: 0;
  }
  65% {
    transform: translateX(-50%) scale(1.25);
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}
.progress-journey.revisit .progress-strip.animated {
  transition: none;
}
.progress-journey.revisit .journey-reveal {
  animation: none;
  opacity: 1;
  transform: none;
}
.progress-journey.revisit.moving.animated .current-progress-marker,
.progress-journey.revisit:not(.moving) .current-progress-marker {
  animation: none;
  opacity: 1;
  transform: translateX(-50%);
}
.progress-journey.revisit.moving.animated .journey-line {
  animation: none;
  opacity: 0.7;
  transform: none;
}
.progress-journey.revisit.moving.animated .current-progress-marker::after,
.progress-journey.revisit:not(.moving) .current-progress-marker::after {
  animation: none;
  opacity: 0;
}
.progress-journey.revisit.moving.animated.celebrating .current-progress-marker::after,
.progress-journey.revisit:not(.moving).animated.celebrating .current-progress-marker::after {
  animation: arrival-halo 1000ms cubic-bezier(0.12, 0.72, 0.2, 1) 120ms forwards;
}
@media (max-width: 650px) {
  .progress-journey {
    width: 100%;
    margin-top: 26px;
  }
  .progress-window {
    height: 116px;
  }
  .progress-journey h2 {
    font-size: 15px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .journey-reveal.animated {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .progress-strip.animated {
    transition: none;
  }
  .progress-journey.moving .current-progress-marker {
    animation: none;
    opacity: 1;
    transform: translateX(-50%);
  }
  .progress-journey.moving .journey-line {
    animation: none;
    opacity: 0.7;
    transform: none;
  }
  .progress-journey .session-start-marker {
    animation: none;
    opacity: 1;
  }
  .progress-journey .current-progress-marker::after {
    animation: none;
    opacity: 0;
  }
  .progress-journey:not(.moving) .current-progress-marker {
    animation: none;
    opacity: 1;
  }
}
</style>
