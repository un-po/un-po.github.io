import { onboardingMessages, type OnboardingMessage } from './practiceContext.ts';

export interface Profile {
  introduced: boolean;
  name: string;
  seenMessages: OnboardingMessage[];
}
export function loadProfile(): Profile {
  try {
    const value = JSON.parse(localStorage.getItem('unpo-profile-v1') ?? 'null');
    return {
      introduced: value?.introduced === true,
      name: typeof value?.name === 'string' ? value.name.trim().slice(0, 40) : '',
      seenMessages: Array.isArray(value?.seenMessages)
        ? onboardingMessages.filter((message) => value.seenMessages.includes(message))
        : Number.isInteger(value?.onboardingProgress)
          ? onboardingMessages.filter((_, index) => value.onboardingProgress > index * 2)
          : value?.introduced === true
            ? [...onboardingMessages]
            : [],
    };
  } catch {
    return { introduced: false, name: '', seenMessages: [] };
  }
}
export function saveProfile(name: string, seenMessages: OnboardingMessage[]): boolean {
  try {
    localStorage.setItem(
      'unpo-profile-v1',
      JSON.stringify({
        introduced: true,
        name: name.trim().slice(0, 40),
        seenMessages: onboardingMessages.filter((message) => seenMessages.includes(message)),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
