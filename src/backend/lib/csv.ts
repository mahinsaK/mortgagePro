const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const cell = String(value ?? "");
  const safeCell = SPREADSHEET_FORMULA_PREFIX.test(cell) ? `'${cell}` : cell;

  return `"${safeCell.replaceAll('"', '""')}"`;
}
