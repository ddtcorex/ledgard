import type { CurrencyCode } from "../../../../shared/types/domain";
import { Money, ProgressBar } from "../../../shared/components/ui";
import { useI18n } from "../../../shared/i18n/I18nProvider";

export function BudgetSummaryCards({
  totalBudget,
  totalSpent,
  progress,
  currency,
  locale
}: {
  totalBudget: number;
  totalSpent: number;
  progress: number;
  currency: CurrencyCode;
  locale: "en" | "vi";
}) {
  const { t } = useI18n();

  return (
    <section className="grid gap-stack-md md:grid-cols-3">
      <div className="surface-card p-4">
        <p className="label">{t("amount")}</p>
        <Money amount={totalBudget} currency={currency} locale={locale} className="mt-2 block text-headline-md font-bold text-primary" />
      </div>
      <div className="surface-card p-4">
        <p className="label">{t("expense")}</p>
        <Money amount={totalSpent} currency={currency} locale={locale} className="mt-2 block text-headline-md font-bold text-danger-crisp" />
      </div>
      <div className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="label">{t("progress")}</p>
          <span className="font-data-mono tabular text-primary">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
    </section>
  );
}
