import type { Attempt } from './practice.ts';
const key = 'unpo-history-v1';
export function loadHistory(): Attempt[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (a): a is Attempt =>
          a !== null &&
          typeof a === 'object' &&
          typeof a.exerciseId === 'string' &&
          typeof a.verb === 'string' &&
          ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'].includes(a.person) &&
          typeof a.answer === 'string' &&
          ['correct', 'typo', 'error'].includes(a.outcome) &&
          Number.isFinite(a.difficulty) &&
          a.difficulty >= 1 &&
          a.difficulty <= 5 &&
          Number.isFinite(a.timestamp),
      )
      .slice(-500);
  } catch {
    return [];
  }
}
export function saveHistory(attempts: Attempt[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(attempts.slice(-500)));
    return true;
  } catch {
    return false;
  }
}

export function clearHistory(): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
