/**
 * Format a stored year-group code (e.g. "Y7") into a human-readable
 * label (e.g. "Year 7").
 */
export function formatYearGroup(yg: string): string {
  const num = yg.replace(/^Y/i, "");
  return `Year ${num}`;
}
