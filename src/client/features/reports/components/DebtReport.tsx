import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import { formatMoney } from "../../../../shared/finance/money";
import { displayText } from "../../../shared/i18n/display";
import { formatDate } from "../../../shared/lib/dates";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { EmptyState } from "../../../shared/components/ui";
import type { CurrencyCode } from "../../../../shared/types/domain";

interface DebtReportProps {
  from: string;
  to: string;
}

interface LoanDebtItem {
  id: string;
  type: "loan" | "debt" | "debt_collection" | "repayment";
  amount: number;
  description: string | null;
  member_name: string;
  account_name: string;
  transaction_date: string;
}

export function DebtReport({ from, to }: DebtReportProps) {
  const { t, locale } = useI18n();

  const { data, isLoading, error } = useQuery({
    queryKey: ["debt-report", from, to],
    queryFn: () => apiClient.debtReport(from, to)
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

  const {
    loansGiven, debtsOwed, collectionsReceived, repaymentsMade,
    totalLoansGiven, totalDebtsOwed, totalCollections, totalRepayments,
    netReceivable, netPayable
  } = data;

  const hasLoansData = loansGiven.length > 0 || collectionsReceived.length > 0;
  const hasDebtsData = debtsOwed.length > 0 || repaymentsMade.length > 0;
  const hasAnyData = hasLoansData || hasDebtsData;

  const netPosition = netReceivable - netPayable;

  return (
    <div className="space-y-3">
      {/* 2-column layout: Loans | Debts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Loans Column */}
        <div className="surface-card p-3 flex flex-col">
          <h3 className="text-body-lg font-bold text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
            {t("loansGiven")}
          </h3>

          {/* Summary */}
          <div className="space-y-1 mb-3 pb-3 border-b border-border-subtle">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("loansGiven")}</span>
              <span className="font-semibold text-primary">{formatMoney(totalLoansGiven, "VND" as CurrencyCode, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("collectionsReceived")}</span>
              <span className="font-semibold text-success">{formatMoney(totalCollections, "VND" as CurrencyCode, locale)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-1 mt-1 border-t border-border-subtle">
              <span>{t("netReceivable")}</span>
              <span className={`font-bold ${netReceivable >= 0 ? "text-success" : "text-danger-crisp"}`}>
                {formatMoney(netReceivable, "VND" as CurrencyCode, locale)}
              </span>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 space-y-1 max-h-48 overflow-y-auto bg-surface-muted -mx-3 px-3 py-2 rounded-lg">
            {!hasLoansData ? (
              <p className="text-body-sm text-on-surface-variant py-2">{t("noData")}</p>
            ) : (
              <>
                {loansGiven.map((item: LoanDebtItem) => (
                  <div key={item.id} className="flex justify-between items-start py-1.5 text-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium truncate">{displayText(item.description, locale) || t("loan")}</p>
                      <p className="text-xs text-on-surface-variant">{displayText(item.member_name, locale)} · {formatDate(item.transaction_date, locale)}</p>
                    </div>
                    <p className="font-bold text-primary shrink-0">-{formatMoney(item.amount, "VND" as CurrencyCode, locale)}</p>
                  </div>
                ))}
                {collectionsReceived.map((item: LoanDebtItem) => (
                  <div key={item.id} className="flex justify-between items-start py-1.5 text-sm bg-success-emerald/5 -mx-2 px-2 rounded">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium truncate text-success">{displayText(item.description, locale) || t("debt_collection")}</p>
                      <p className="text-xs text-on-surface-variant">{displayText(item.member_name, locale)} · {formatDate(item.transaction_date, locale)}</p>
                    </div>
                    <p className="font-bold text-success shrink-0">+{formatMoney(item.amount, "VND" as CurrencyCode, locale)}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Debts Column */}
        <div className="surface-card p-3 flex flex-col">
          <h3 className="text-body-lg font-bold text-danger-crisp mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">credit_card</span>
            {t("debtsOwed")}
          </h3>

          {/* Summary */}
          <div className="space-y-1 mb-3 pb-3 border-b border-border-subtle">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("debtsOwed")}</span>
              <span className="font-semibold text-danger-crisp">{formatMoney(totalDebtsOwed, "VND" as CurrencyCode, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("repaymentsMade")}</span>
              <span className="font-semibold text-success">{formatMoney(totalRepayments, "VND" as CurrencyCode, locale)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-1 mt-1 border-t border-border-subtle">
              <span>{t("netPayable")}</span>
              <span className={`font-bold ${netPayable <= 0 ? "text-success" : "text-danger-crisp"}`}>
                {formatMoney(netPayable, "VND" as CurrencyCode, locale)}
              </span>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 space-y-1 max-h-48 overflow-y-auto bg-surface-muted -mx-3 px-3 py-2 rounded-lg">
            {!hasDebtsData ? (
              <p className="text-body-sm text-on-surface-variant py-2">{t("noData")}</p>
            ) : (
              <>
                {debtsOwed.map((item: LoanDebtItem) => (
                  <div key={item.id} className="flex justify-between items-start py-1.5 text-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium truncate">{displayText(item.description, locale) || t("debt")}</p>
                      <p className="text-xs text-on-surface-variant">{displayText(item.member_name, locale)} · {formatDate(item.transaction_date, locale)}</p>
                    </div>
                    <p className="font-bold text-danger-crisp shrink-0">+{formatMoney(item.amount, "VND" as CurrencyCode, locale)}</p>
                  </div>
                ))}
                {repaymentsMade.map((item: LoanDebtItem) => (
                  <div key={item.id} className="flex justify-between items-start py-1.5 text-sm bg-success-emerald/5 -mx-2 px-2 rounded">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium truncate text-success">{displayText(item.description, locale) || t("repayment")}</p>
                      <p className="text-xs text-on-surface-variant">{displayText(item.member_name, locale)} · {formatDate(item.transaction_date, locale)}</p>
                    </div>
                    <p className="font-bold text-success shrink-0">-{formatMoney(item.amount, "VND" as CurrencyCode, locale)}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Net Position Banner */}
      {hasAnyData && (
        <div className="surface-card p-4">
          <div className="flex justify-between items-center">
            <span className="text-body-lg font-medium text-on-surface">{t("netPosition")}</span>
            <span className={`text-2xl font-bold ${netPosition >= 0 ? "text-success" : "text-danger-crisp"}`}>
              {formatMoney(netPosition, "VND" as CurrencyCode, locale)}
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasAnyData && <EmptyState label={t("noData")} />}
    </div>
  );
}