import { tenses, type Tense } from './practice.ts';

export type UnlockMessage = `unlock:${Tense}`;
export const unlockCopy: Record<UnlockMessage, { heading: string; description: string }> = {
  'unlock:presente': {
    heading: 'Hai sbloccato il presente!',
    description: 'Spazio a quello che succede, una frase alla volta.',
  },
  'unlock:passato_prossimo': {
    heading: 'Hai sbloccato il passato prossimo!',
    description: 'Un nuovo modo di raccontare.',
  },
  'unlock:imperfetto': {
    heading: 'Hai sbloccato l’imperfetto!',
    description: 'Un nuovo modo di raccontare.',
  },
  'unlock:futuro_semplice': {
    heading: 'Hai sbloccato il futuro semplice!',
    description: 'Spazio ai programmi di domani.',
  },
};

export function isUnlockMessage(message: string): message is UnlockMessage {
  return Object.hasOwn(unlockCopy, message);
}

export function newTenseMessages(
  before: readonly string[],
  after: readonly string[],
): UnlockMessage[] {
  return tenses
    .filter(
      (tense) =>
        !before.some((band) => band.startsWith(`${tense}:`)) &&
        after.some((band) => band.startsWith(`${tense}:`)),
    )
    .map((tense): UnlockMessage => `unlock:${tense}`);
}

const pendingKey = 'unpo-pending-unlocks-v1';
export function loadPendingUnlocks(): UnlockMessage[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(pendingKey) ?? '[]');
    return Array.isArray(stored)
      ? [
          ...new Set(
            stored.filter(
              (value): value is UnlockMessage =>
                typeof value === 'string' && isUnlockMessage(value),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

export function savePendingUnlocks(messages: UnlockMessage[]): void {
  try {
    if (messages.length) localStorage.setItem(pendingKey, JSON.stringify(messages));
    else localStorage.removeItem(pendingKey);
  } catch {
    // The current session still shows the announcement when storage is unavailable.
  }
}
