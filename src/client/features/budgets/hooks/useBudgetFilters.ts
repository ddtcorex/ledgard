import { useState, useMemo } from "react";
import type { BudgetView } from "../../../../shared/types/domain";

export function useBudgetFilters(budgets: BudgetView[], members: Array<{ id: string; name: string }>) {
  const [memberFilter, setMemberFilter] = useState<string>("shared");

  const shared = useMemo(() => budgets.filter((budget) => budget.member_id === null), [budgets]);

  const individual = useMemo(() => budgets.filter((budget) => budget.member_id !== null), [budgets]);

  const visibleIndividual = useMemo(() => {
    if (memberFilter === "shared") {
      return individual;
    }
    return individual.filter((budget) => budget.member_id === memberFilter);
  }, [individual, memberFilter]);

  return {
    memberFilter,
    setMemberFilter,
    shared,
    individual,
    visibleIndividual
  };
}
