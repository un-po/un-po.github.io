import type { Outcome } from './practice.ts';

export const onboardingMessages = ['introduction', 'keyboard', 'name'] as const;
export type OnboardingMessage = (typeof onboardingMessages)[number];
export type PracticeMessage =
  OnboardingMessage | 'welcome' | 'level' | 'encouragement' | 'momentum';

export function initialPracticeMessages(
  seen: OnboardingMessage[],
  hasName: boolean,
): PracticeMessage[] {
  const pending = onboardingMessages.filter(
    (message) => !seen.includes(message) && !(message === 'name' && hasName),
  );
  return pending.length ? pending : ['welcome', 'level'];
}

export function streakMessage(
  outcomes: Outcome[],
  random: () => number = Math.random,
): PracticeMessage | null {
  const recent = outcomes.slice(-4);
  if (recent.length < 4) return null;
  const message = recent.every((outcome) => outcome === 'correct')
    ? 'momentum'
    : recent.every((outcome) => outcome === 'error')
      ? 'encouragement'
      : null;
  return message && random() < 0.5 ? message : null;
}

export const contextTiming = {
  initial: 4000,
  entering: 450,
  visible: 20000,
  leaving: 350,
  quiet: 40000,
} as const;
type Phase = 'idle' | 'initial' | 'entering' | 'visible' | 'leaving' | 'quiet';
export interface MessageQueueState {
  phase: Phase;
  message: PracticeMessage | null;
}
export interface QueueClock {
  now: () => number;
  schedule: (callback: () => void, delay: number) => () => void;
}
const browserClock: QueueClock = {
  now: () => Date.now(),
  schedule(callback, delay) {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
};

// Owns timing and deduplication so producers only need to enqueue content.
export class PracticeMessageQueue {
  state: MessageQueueState = { phase: 'idle', message: null };
  private pending: { message: PracticeMessage; expiresAt?: number }[] = [];
  private queued = new Set<PracticeMessage>();
  private started = false;
  private paused = false;
  private remaining = 0;
  private scheduledAt = 0;
  private cancelTimer: (() => void) | undefined;
  private changed: (state: MessageQueueState) => void;
  private completed: (message: PracticeMessage) => void;
  private clock: QueueClock;

  constructor(
    changed: (state: MessageQueueState) => void,
    completed: (message: PracticeMessage) => void,
    clock: QueueClock = browserClock,
  ) {
    this.changed = changed;
    this.completed = completed;
    this.clock = clock;
  }

  enqueue(messages: PracticeMessage | PracticeMessage[], expiresIn?: number) {
    for (const message of Array.isArray(messages) ? messages : [messages]) {
      if (this.queued.has(message)) continue;
      this.queued.add(message);
      this.pending.push({
        message,
        expiresAt: expiresIn === undefined ? undefined : this.clock.now() + expiresIn,
      });
    }
    if (!this.pending.length || this.state.phase !== 'idle') return;
    if (!this.started) {
      this.started = true;
      this.transition('initial', null, contextTiming.initial);
    } else this.showNext();
  }

  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      if (this.cancelTimer)
        this.remaining = Math.max(0, this.remaining - (this.clock.now() - this.scheduledAt));
      this.cancelTimer?.();
      this.cancelTimer = undefined;
    } else this.schedule();
  }

  dispose() {
    this.cancelTimer?.();
  }

  private transition(phase: Phase, message: PracticeMessage | null, delay: number) {
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    this.state = { phase, message };
    this.remaining = delay;
    this.changed(this.state);
    this.schedule();
  }

  private schedule() {
    if (this.paused || this.state.phase === 'idle') return;
    this.scheduledAt = this.clock.now();
    this.cancelTimer = this.clock.schedule(() => {
      this.cancelTimer = undefined;
      switch (this.state.phase) {
        case 'initial':
        case 'quiet':
          this.showNext();
          break;
        case 'entering':
          this.transition('visible', this.state.message, contextTiming.visible);
          break;
        case 'visible':
          this.transition('leaving', this.state.message, contextTiming.leaving);
          break;
        case 'leaving':
          if (this.state.message) this.completed(this.state.message);
          this.transition('quiet', null, contextTiming.quiet);
          break;
      }
    }, this.remaining);
  }

  private showNext() {
    while (this.pending.length) {
      const entry = this.pending.shift()!;
      if (entry.expiresAt !== undefined && entry.expiresAt <= this.clock.now()) {
        this.queued.delete(entry.message);
        continue;
      }
      this.transition('entering', entry.message, contextTiming.entering);
      return;
    }
    this.transition('idle', null, 0);
  }
}
