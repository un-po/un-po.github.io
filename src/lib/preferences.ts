const tableKey = 'unpo-table-visible-v1';
const tenseKey = 'unpo-tense-visible-v1';

export function loadTenseVisibility(): boolean {
  try {
    return localStorage.getItem(tenseKey) !== 'false';
  } catch {
    return true;
  }
}
export function saveTenseVisibility(visible: boolean): void {
  try {
    localStorage.setItem(tenseKey, String(visible));
  } catch {
    /* Still works for this visit. */
  }
}

export function loadTableVisibility(): boolean {
  try {
    return localStorage.getItem(tableKey) !== 'false';
  } catch {
    return true;
  }
}
export function saveTableVisibility(visible: boolean): void {
  try {
    localStorage.setItem(tableKey, String(visible));
  } catch {
    /* Still works for this visit. */
  }
}
