const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2023-04" → "Apr 2023", "2023" → "2023", "" → "". */
export function formatPartialDate(value: string): string {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!month) return year ?? '';
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : value;
}

/** Formats a date range such as "Apr 2021 – Present". */
export function formatDateRange(start: string, end: string, current = false): string {
  const from = formatPartialDate(start);
  const to = current ? 'Present' : formatPartialDate(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}
