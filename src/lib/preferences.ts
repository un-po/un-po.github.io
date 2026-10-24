const tableKey = 'unpo-table-visible-v1';
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
