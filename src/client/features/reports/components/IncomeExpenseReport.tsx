import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { apiClient } from "../../../shared/api/client";
import { formatMoney } from "../../../../shared/finance/money";
import { useI18n } from "../../../shared/i18n/I18nProvider";

interface IncomeExpenseReportProps {
  from: string;
  to: string;
  comparisonEnabled: boolean;
}

export function IncomeExpenseReport({ from, to, comparisonEnabled }: IncomeExpenseReportProps) {
  const { t, locale } = useI18n();

  // Calculate comparison period (previous period of same length)
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodLength = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

  const compareToDate = new Date(fromDate);
  compareToDate.setDate(compareToDate.getDate() - 1);
  const compareFromDate = new Date(compareToDate);
  compareFromDate.setDate(compareFromDate.getDate() - periodLength + 1);

  const compareFrom = compareFromDate.toISOString().slice(0, 10);
  const compareTo = compareToDate.toISOString().slice(0, 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["income-expense-report", from, to, comparisonEnabled ? compareFrom : null, comparisonEnabled ? compareTo : null],
    queryFn: () => apiClient.incomeExpenseReport(from, to, comparisonEnabled ? compareFrom : undefined, comparisonEnabled ? compareTo : undefined)
  });

  if (isLoading) {
    return (
      <div className="surface-card p-3">
        <p className="text-body-sm text-on-surface-variant">{t("loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-card p-3">
        <p className="text-body-sm text-error">{t("unableToLoadData")}</p>
      </div>
    );
  }

  const { current, comparison } = data;

  return (
    <div className="space-y-3">
      {/* Current Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="surface-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">{t("totalIncome")}</p>
          <p className="text-lg font-bold text-success">{formatMoney(current.income, "VND", locale)}</p>
        </div>
        <div className="surface-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">{t("totalExpense")}</p>
          <p className="text-lg font-bold text-danger-crisp">{formatMoney(current.expense, "VND", locale)}</p>
        </div>
        <div className="surface-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">{t("netIncome")}</p>
          <p className={`text-lg font-bold ${current.net >= 0 ? "text-success" : "text-danger-crisp"}`}>
            {formatMoney(current.net, "VND", locale)}
          </p>
        </div>
      </div>

      {/* Comparison */}
      {comparisonEnabled && comparison && (
        <div className="surface-card p-3">
          <h3 className="text-body-lg font-bold text-primary mb-3">{t("comparison")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">{t("totalIncome")}</p>
              <p className="text-body-md font-semibold text-on-surface">
                {formatMoney(comparison.income, "VND", locale)}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${comparison.incomeChange >= 0 ? "text-success" : "text-danger-crisp"}`}>
                {comparison.incomeChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="font-semibold">{Math.abs(comparison.incomeChange).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">{t("totalExpense")}</p>
              <p className="text-body-md font-semibold text-on-surface">
                {formatMoney(comparison.expense, "VND", locale)}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${comparison.expenseChange >= 0 ? "text-danger-crisp" : "text-success"}`}>
                {comparison.expenseChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="font-semibold">{Math.abs(comparison.expenseChange).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">{t("netIncome")}</p>
              <p className="text-body-md font-semibold text-on-surface">
                {formatMoney(comparison.net, "VND", locale)}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${comparison.netChange >= 0 ? "text-success" : "text-danger-crisp"}`}>
                {comparison.netChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="font-semibold">{Math.abs(comparison.netChange).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
