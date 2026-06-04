import { Plus } from "lucide-react";
import { useI18n } from "../../../shared/i18n/I18nProvider";

export function BudgetHeader({
  selectedMonth,
  onMonthChange,
  onAddBudget
}: {
  selectedMonth: string; // YYYY-MM format
  onMonthChange: (month: string) => void;
  onAddBudget: () => void;
}) {
  const { t } = useI18n();

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-headline-lg font-bold text-primary md:text-display-kpi-mobile">{t("budgets")}</h1>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="month"
          className="field font-data-mono tabular"
          value={selectedMonth}
          onChange={(event) => onMonthChange(event.target.value)}
          aria-label={t("date")}
        />
        <button type="button" onClick={onAddBudget} className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-label-caps font-bold uppercase text-on-primary">
          <Plus size={18} />
          {t("addBudget")}
        </button>
      </div>
    </header>
  );
}
