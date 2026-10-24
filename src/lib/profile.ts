export interface Profile {
  introduced: boolean;
  name: string;
}
export function loadProfile(): Profile {
  try {
    const value = JSON.parse(localStorage.getItem('unpo-profile-v1') ?? 'null');
    return {
      introduced: value?.introduced === true,
      name: typeof value?.name === 'string' ? value.name.trim().slice(0, 40) : '',
    };
  } catch {
    return { introduced: false, name: '' };
  }
}
export function saveProfile(name: string): boolean {
  try {
    localStorage.setItem(
      'unpo-profile-v1',
      JSON.stringify({ introduced: true, name: name.trim().slice(0, 40) }),
    );
    return true;
  } catch {
    return false;
  }
}
