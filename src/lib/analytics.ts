type AnalyticsEvent =
  'session_started' | 'answer_correct' | 'answer_typo' | 'answer_incorrect' | 'session_completed';

declare global {
  interface Window {
    umami?: {
      track: (eventName: AnalyticsEvent) => void;
    };
  }
}

export function trackEvent(eventName: AnalyticsEvent): void {
  window.umami?.track(eventName);
}
