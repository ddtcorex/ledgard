import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { BudgetList } from "./BudgetList";

export function BudgetGroup({
  title,
  budgets,
  currency,
  locale,
  onEdit,
  onDelete,
  empty
}: {
  title: string;
  budgets: BudgetView[];
  currency: CurrencyCode;
  locale: "en" | "vi";
  onEdit: (budget: BudgetView) => void;
  onDelete: (id: string) => void;
  empty: string;
}) {
  return (
    <article className="surface-card overflow-hidden">
      <div className="border-b border-border-subtle p-4">
        <h2 className="text-headline-md font-bold text-primary">{title}</h2>
      </div>
      <BudgetList budgets={budgets} currency={currency} locale={locale} onEdit={onEdit} onDelete={onDelete} empty={empty} />
    </article>
  );
}
