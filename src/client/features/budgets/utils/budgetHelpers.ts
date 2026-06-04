import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { formatMoney } from "../../../../shared/finance/money";

export interface BudgetStatus {
  text: string;
  color: string;
  barColor: string;
}

export function getBudgetStatus(
  budget: BudgetView,
  currency: CurrencyCode,
  locale: "en" | "vi",
  t: (key: string) => string
): BudgetStatus {
  const diff = budget.amount - budget.spent;

  if (diff >= 0) {
    return {
      text: `${formatMoney(diff, currency, locale)} ${t("left")}`,
      color: "text-on-surface-variant font-medium",
      barColor: budget.spent / budget.amount > 0.8 ? "bg-warning-orange" : "bg-success-emerald"
    };
  } else {
    return {
      text: `${formatMoney(Math.abs(diff), currency, locale)} ${t("over")}`,
      color: "text-danger-crisp font-semibold",
      barColor: "bg-danger-crisp"
    };
  }
}

export function getDaysRemainingInMonth(year: number, month: number): number {
  const now = new Date();

  if (now.getFullYear() === year && (now.getMonth() + 1) === month) {
    const lastDay = new Date(year, month, 0).getDate();
    return Math.max(1, lastDay - now.getDate() + 1);
  }

  return 1;
}

export function calculateProgress(spent: number, amount: number): number {
  return amount > 0 ? Math.round((spent / amount) * 100) : 0;
}

export function formatBudgetPeriod(year: number, month: number, locale: "en" | "vi"): string {
  const monthStr = String(month).padStart(2, "0");
  return locale === "vi" ? `Tháng ${monthStr}/${year}` : `${monthStr}/${year}`;
}

export function calculateRemainingPerDay(remaining: number, daysRemaining: number): number {
  return remaining > 0 ? Math.round(remaining / daysRemaining) : 0;
}
