export type DateRangePreset =
  | "today"
  | "week"
  | "month"
  | "lastMonth"
  | "quarter"
  | "year"
  | "lastYear"
  | "lifetime"
  | "custom";

/**
 * Shared period options used across all pages with period selection.
 * This ensures consistent options everywhere (Dashboard, Ledger, Reports, etc.)
 */
export const PERIOD_OPTIONS = [
  "today",
  "week",
  "month",
  "lastMonth",
  "quarter",
  "year",
  "lastYear",
  "lifetime",
] as const;

export type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthRange(now = new Date()): { from: string; to: string; month: number; year: number } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = toIsoDateLocal(now);
  return { from, to, month, year };
}

export function todayIso(): string {
  return toIsoDateLocal(new Date());
}

export function getPresetDateRange(preset: Exclude<DateRangePreset, "custom">, now = new Date()): { from: string; to: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "week") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  }

  if (preset === "month") {
    start.setDate(1);
  }

  if (preset === "lastMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }

  if (preset === "quarter") {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  }

  if (preset === "year") {
    start.setMonth(0, 1);
  }

  if (preset === "lastYear") {
    start.setFullYear(start.getFullYear() - 1, 0, 1);
    end.setFullYear(start.getFullYear(), 11, 31);
  }

  if (preset === "lifetime") {
    // Return a very old start date to include all transactions
    start.setFullYear(2000, 0, 1);
  }

  return {
    from: toIsoDateLocal(start),
    to: toIsoDateLocal(end)
  };
}

export function formatDate(isoDate: string, locale: string): string {
  if (!isoDate) return isoDate;
  try {
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC"
      }).format(date);
    }
    return isoDate;
  } catch {
    return isoDate;
  }
}

export function formatMonthYear(year: number, month: number, locale: string): string {
  try {
    const date = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(date);
  } catch {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
}
