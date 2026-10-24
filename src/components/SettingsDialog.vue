<script setup lang="ts">
import { ref } from 'vue';
import { setTheme, themeMode, type ThemeMode } from '../lib/theme.ts';

const props = defineProps<{ name: string; showConjugation: boolean }>();
const emit = defineEmits<{
  'update:name': [value: string];
  'update:showConjugation': [value: boolean];
  resetProgress: [];
  openPrivacy: [];
  closed: [];
}>();
const dialog = ref<HTMLDialogElement>();

function open() {
  dialog.value?.showModal();
}
function close() {
  dialog.value?.close();
}
function updateName(value: string) {
  emit('update:name', value.slice(0, 40));
}
function chooseTheme(mode: ThemeMode) {
  setTheme(mode);
}
function confirmReset() {
  if (
    window.confirm(
      'Vuoi davvero azzerare tutti i progressi? Questa azione non può essere annullata.',
    )
  ) {
    emit('resetProgress');
  }
}
function showPrivacy() {
  close();
  emit('openPrivacy');
}

defineExpose({ open, close });
</script>

<template>
  <dialog
    ref="dialog"
    class="help-dialog settings-dialog"
    aria-labelledby="settings-heading"
    @click="(event) => event.target === dialog && close()"
    @close="emit('closed')"
  >
    <button class="icon-button dialog-close" type="button" aria-label="Chiudi" @click="close">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    </button>
    <span class="eyebrow">SENTITI A CASA</span>
    <h2 id="settings-heading">Impostazioni</h2>

    <section class="settings-section">
      <h3>Come ti chiami?</h3>
      <div class="settings-name-row">
        <input
          :value="props.name"
          type="text"
          autocomplete="given-name"
          maxlength="40"
          placeholder="Il tuo nome"
          aria-label="Il tuo nome"
          @input="updateName(($event.target as HTMLInputElement).value)"
        />
        <button class="quiet-button" type="button" :disabled="!props.name" @click="updateName('')">
          Cancella
        </button>
      </div>
    </section>

    <section class="settings-section">
      <h3>Aspetto</h3>
      <div class="theme-chips" role="group" aria-label="Tema">
        <button
          v-for="option in ['auto', 'light', 'dark'] as ThemeMode[]"
          :key="option"
          class="theme-chip"
          :class="{ selected: themeMode === option }"
          type="button"
          :aria-pressed="themeMode === option"
          @click="chooseTheme(option)"
        >
          {{ option === 'auto' ? 'Sistema' : option === 'light' ? 'Chiaro' : 'Scuro' }}
        </button>
      </div>
    </section>

    <section class="settings-section">
      <label class="checkbox-row">
        <input
          type="checkbox"
          :checked="props.showConjugation"
          @change="emit('update:showConjugation', ($event.target as HTMLInputElement).checked)"
        />
        <span>Mostra la tabella di coniugazione dopo un errore</span>
      </label>
    </section>

    <section class="settings-section settings-danger">
      <button class="text-link danger-link" type="button" @click="confirmReset">
        Azzera i miei progressi
      </button>
      <button class="text-link" type="button" @click="showPrivacy">
        Come vengono usati i miei dati?
      </button>
    </section>
  </dialog>
</template>
