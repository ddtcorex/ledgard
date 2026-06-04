import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { EmptyState } from "../../../shared/components/ui";
import { BudgetRow } from "./BudgetRow";

export function BudgetList({
  budgets,
  currency,
  locale,
  onEdit,
  onDelete,
  empty
}: {
  budgets: BudgetView[];
  currency: CurrencyCode;
  locale: "en" | "vi";
  onEdit: (budget: BudgetView) => void;
  onDelete: (id: string) => void;
  empty: string;
}) {
  if (!budgets.length) {
    return (
      <div className="p-4">
        <EmptyState label={empty} />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {budgets.map((budget) => (
        <BudgetRow
          key={budget.id}
          budget={budget}
          currency={currency}
          locale={locale}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
