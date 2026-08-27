/**
 * Pure scheduling helpers for recurring invoices, extracted from the cron route
 * so the date-advance logic is unit-testable without a database.
 */

export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/** Advance a date by one recurrence interval. Pure — no I/O. */
export function calcNextRunDate(
  date: Date,
  freq: RecurrenceFrequency,
  interval: number,
): Date {
  const d = new Date(date);
  switch (freq) {
    case "daily":
      d.setDate(d.getDate() + interval);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7 * interval);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + interval);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3 * interval);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + interval);
      break;
  }
  return d;
}
