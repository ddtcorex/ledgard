import { useMemo } from "react";
import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { getBudgetStatus, calculateProgress, getDaysRemainingInMonth, calculateRemainingPerDay } from "../utils/budgetHelpers";

export function useBudgetCalculations(
  budgets: BudgetView[],
  currency: CurrencyCode,
  locale: "en" | "vi",
  t: (key: string) => string,
  year: number,
  month: number
) {
  return useMemo(() => {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const progress = calculateProgress(totalSpent, totalBudget);
    const daysRemaining = getDaysRemainingInMonth(year, month);

    const shared = budgets.filter((budget) => budget.member_id === null);
    const individual = budgets.filter((budget) => budget.member_id !== null);

    const sharedBudgetTotal = shared.reduce((sum, b) => sum + b.amount, 0);
    const sharedSpentTotal = shared.reduce((sum, b) => sum + b.spent, 0);
    const sharedProgress = calculateProgress(sharedSpentTotal, sharedBudgetTotal);
    const sharedRemaining = sharedBudgetTotal - sharedSpentTotal;
    const sharedRemainingPerDay = calculateRemainingPerDay(sharedRemaining, daysRemaining);

    const individualBudgetTotal = individual.reduce((sum, b) => sum + b.amount, 0);
    const individualSpentTotal = individual.reduce((sum, b) => sum + b.spent, 0);

    return {
      totalBudget,
      totalSpent,
      progress,
      daysRemaining,
      shared,
      individual,
      sharedBudgetTotal,
      sharedSpentTotal,
      sharedProgress,
      sharedRemaining,
      sharedRemainingPerDay,
      individualBudgetTotal,
      individualSpentTotal,
      getBudgetStatusForBudget: (budget: BudgetView) => getBudgetStatus(budget, currency, locale, t)
    };
  }, [budgets, currency, locale, t, year, month]);
}

export function usePersonalBudgetCalculations(
  budgets: BudgetView[],
  currentUserId: string | undefined
) {
  return useMemo(() => {
    if (!currentUserId) {
      return {
        personalSpentTotal: 0,
        personalBudgetTotal: 0,
        personalProgress: 0,
        personalRemaining: 0
      };
    }

    const personalBudgets = budgets.filter((b) => b.member_id === currentUserId);
    const personalSpentTotal = personalBudgets.reduce((sum, b) => sum + b.spent, 0);
    const personalBudgetTotal = personalBudgets.reduce((sum, b) => sum + b.amount, 0);
    const personalProgress = calculateProgress(personalSpentTotal, personalBudgetTotal);
    const personalRemaining = personalBudgetTotal - personalSpentTotal;

    return {
      personalSpentTotal,
      personalBudgetTotal,
      personalProgress,
      personalRemaining
    };
  }, [budgets, currentUserId]);
}
