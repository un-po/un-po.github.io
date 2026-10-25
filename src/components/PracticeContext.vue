<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
  contextTiming,
  PracticeMessageQueue,
  type MessageQueueState,
  type PracticeMessage,
} from '../lib/practiceContext.ts';

const props = defineProps<{
  initialMessages: PracticeMessage[];
  paused: boolean;
  suppressed: boolean;
  name: string;
  level: number;
}>();
const emit = defineEmits<{
  saveName: [name: string];
  interact: [];
  completed: [message: PracticeMessage];
}>();
const draftName = ref(props.name);
const editing = ref(false);
const state = shallowRef<MessageQueueState>({ phase: 'idle', message: null });
const level = ref(props.level);
const rank = computed(() => ['I', 'II', 'III', 'IV', 'V'][Math.ceil(level.value / 5) - 1]);
const message = computed(() =>
  ['entering', 'visible', 'leaving'].includes(state.value.phase) ? state.value.message : null,
);
const paused = computed(() => props.paused || editing.value);
const queue = new PracticeMessageQueue(
  (snapshot) => {
    state.value = snapshot;
    if (snapshot.phase === 'entering') level.value = props.level;
  },
  (message) => emit('completed', message),
);
watch(paused, (value) => queue.setPaused(value), { immediate: true });
watch(
  () => props.name,
  (name) => {
    draftName.value = name;
    editing.value = false;
  },
);

function saveName() {
  const name = draftName.value.trim();
  if (name) {
    editing.value = false;
    emit('saveName', name);
  }
}

function startEditing() {
  editing.value = true;
  emit('interact');
}
function stopEditing(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    editing.value = false;
}
function enqueue(messages: PracticeMessage | PracticeMessage[], expiresIn?: number) {
  queue.enqueue(messages, expiresIn);
}
onMounted(() => queue.enqueue(props.initialMessages));
onBeforeUnmount(() => queue.dispose());
defineExpose({ enqueue });
</script>

<template>
  <div
    class="practice-context"
    :data-message="suppressed ? 'empty' : (message ?? 'empty')"
    :data-phase="state.phase"
    aria-live="polite"
    :style="{
      '--context-enter': `${contextTiming.entering}ms`,
      '--context-leave': `${contextTiming.leaving}ms`,
    }"
  >
    <div
      v-if="message"
      :key="message"
      class="context-copy"
      :class="[state.phase, { paused, suppressed }]"
    >
      <template v-if="message === 'introduction'">
        <h2>Sbagliando, una frase alla volta.</h2>
        <p>Completa la frase con il verbo indicato.</p>
      </template>
      <p v-else-if="message === 'keyboard'">
        <kbd>Invio</kbd> per verificare o continuare.<br />
        <kbd>↑</kbd> e <kbd>↓</kbd> per rivedere le frasi.
      </p>
      <template v-else-if="message === 'name'">
        <h2 v-if="name">Piacere, {{ name }}.</h2>
        <form
          v-else
          class="context-name-form"
          @submit.prevent="saveName"
          @focusin="startEditing"
          @focusout="stopEditing"
        >
          <label for="practice-name">Come ti chiami? Solo se ti va.</label>
          <div class="context-name-row">
            <input
              id="practice-name"
              v-model="draftName"
              type="text"
              autocomplete="given-name"
              maxlength="40"
              placeholder="Il tuo nome"
            />
            <button type="submit" class="quiet-button" :disabled="!draftName.trim()">
              Piacere!
            </button>
          </div>
        </form>
      </template>
      <h2 v-else-if="message === 'welcome'">
        {{ name ? `Che bello rivederti, ${name}.` : 'Che bello rivederti.' }}
      </h2>
      <template v-else-if="message === 'level'">
        <p class="context-level">
          Livello <strong>{{ level }}</strong> <span aria-hidden="true">·</span> Grado
          <strong class="rank-numeral">{{ rank }}</strong>
        </p>
        <p>Una frase alla volta, al tuo ritmo.</p>
      </template>
      <template v-else-if="message === 'encouragement'">
        <h2>Un po’ alla volta.</h2>
        <p>Le forme nuove hanno bisogno di qualche giro in più.</p>
      </template>
      <template v-else-if="message === 'momentum'">
        <h2>Stai prendendo il ritmo.</h2>
        <p>Una frase tira l’altra.</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.practice-context {
  height: calc(var(--sentence-row-height) / 2);
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  text-align: center;
}
.context-copy {
  width: min(520px, 100%);
}
.context-copy.entering {
  animation: context-appears var(--context-enter) ease-out both;
}
.context-copy.leaving {
  animation: context-disappears var(--context-leave) ease-in both;
}
.context-copy.paused {
  animation-play-state: paused;
}
.context-copy.suppressed {
  visibility: hidden;
}
h2,
.context-name-form label {
  display: block;
  margin: 0;
  color: var(--ink);
  font:
    400 16px/1.8 'Playwrite IT Trad',
    var(--hand);
}
p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}
kbd {
  font: inherit;
  color: var(--ink);
}
.context-level {
  color: var(--ink);
  font-size: 16px;
}
.context-level strong {
  margin-left: 5px;
  font: 500 23px/1 var(--hand);
}
.context-level strong.rank-numeral {
  font:
    400 21px/1 'Times New Roman',
    Times,
    serif;
}
.context-level span {
  margin: 0 9px;
  color: var(--faint);
}
.context-name-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(330px, 100%);
  margin: 9px auto 0;
}
.context-name-row input {
  width: 100%;
  min-width: 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: var(--field-wash);
  padding: 8px 4px;
  color: var(--ink);
  font-size: 16px;
}
.context-name-row input:focus {
  border-bottom-color: var(--accent);
  outline: none;
}
.context-name-row button:disabled {
  opacity: 0.45;
  cursor: default;
}
@keyframes context-appears {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes context-disappears {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
@media (max-width: 650px) {
  h2,
  .context-name-form label {
    font-size: 14px;
  }
  p {
    font-size: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .context-copy.entering,
  .context-copy.leaving {
    animation: none;
  }
}
</style>
