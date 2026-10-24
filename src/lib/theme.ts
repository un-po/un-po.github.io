import { ref } from 'vue';

export type ThemeMode = 'auto' | 'light' | 'dark';

const media = window.matchMedia('(prefers-color-scheme: dark)');

function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('unpo-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export const themeMode = ref<ThemeMode>(loadTheme());

function resolvedTheme(): 'light' | 'dark' {
  return themeMode.value === 'auto' ? (media.matches ? 'dark' : 'light') : themeMode.value;
}

function applyTheme(): void {
  const resolved = resolvedTheme();
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#1d2322' : '#f7f8f5');
}

export function setTheme(mode: ThemeMode): void {
  themeMode.value = mode;
  try {
    if (mode === 'auto') localStorage.removeItem('unpo-theme');
    else localStorage.setItem('unpo-theme', mode);
  } catch {
    // The selection still applies for this visit.
  }
  applyTheme();
}

export function cycleTheme(): void {
  const modes: ThemeMode[] = ['auto', 'light', 'dark'];
  setTheme(modes[(modes.indexOf(themeMode.value) + 1) % modes.length]!);
}

media.addEventListener('change', () => {
  if (themeMode.value === 'auto') applyTheme();
});

applyTheme();
