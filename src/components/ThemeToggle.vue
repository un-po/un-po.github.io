<script setup lang="ts">
import { computed } from 'vue';
import { cycleTheme, themeMode } from '../lib/theme.ts';

const label = computed(() => {
  const current =
    themeMode.value === 'auto' ? 'automatico' : themeMode.value === 'light' ? 'chiaro' : 'scuro';
  return `Tema ${current}. Cambia tema`;
});
</script>
<template>
  <button class="icon-button theme-toggle" type="button" :aria-label="label" @click="cycleTheme">
    <svg
      v-if="themeMode === 'auto'"
      class="theme-icon-system"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none" />
    </svg>
    <svg
      v-else-if="themeMode === 'light'"
      class="theme-icon-light"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </svg>
    <svg v-else class="theme-icon-dark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5 8.8 8.8 0 1 0 20.5 14.1Z" />
    </svg>
  </button>
</template>
