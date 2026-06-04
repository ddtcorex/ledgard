import { Edit2, Trash2 } from "lucide-react";
import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { Money, ProgressBar } from "../../../shared/components/ui";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";

export function BudgetRow({
  budget,
  currency,
  locale,
  onEdit,
  onDelete
}: {
  budget: BudgetView;
  currency: CurrencyCode;
  locale: "en" | "vi";
  onEdit: (budget: BudgetView) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-on-surface">{displayText(budget.category_name, locale)}</p>
          <p className="text-sm text-on-surface-variant">{budget.member_name ?? t("shared")}</p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right mt-2 md:mt-0 md:pt-2">
            <Money amount={budget.spent} currency={currency} locale={locale} className={budget.progress >= 100 ? "text-danger-crisp" : "text-primary"} />
            <span className="text-on-surface-variant"> / </span>
            <Money amount={budget.amount} currency={currency} locale={locale} className="text-on-surface-variant" />
          </div>
          <div className="action-group">
            <button type="button" className="action-group-btn" onClick={() => onEdit(budget)} aria-label={t("editBudget")}>
              <Edit2 size={14} />
            </button>
            <div className="action-group-divider" />
            <button type="button" className="action-group-btn danger" onClick={() => onDelete(budget.id)} aria-label={t("delete")}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      <ProgressBar value={budget.progress} />
    </div>
  );
}
