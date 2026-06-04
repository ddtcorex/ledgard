import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { apiClient } from "../api/client";
import { EmptyState, ErrorState, LoadingState, Modal } from "./ui";
import { formatMoney } from "../../../shared/finance/money";
import { displayText } from "../i18n/display";
import { useI18n } from "../i18n/I18nProvider";
import { TransactionItem } from "./TransactionItem";
import { useTransactionModal } from "./TransactionModal";
import type { CurrencyCode } from "../../../shared/types/domain";

interface CategoryTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string | null;
  categoryName: string;
  from: string;
  to: string;
  currency: CurrencyCode;
}

export function CategoryTransactionsModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  from,
  to,
  currency
}: CategoryTransactionsModalProps) {
  const { t, locale } = useI18n();
  const { openEdit } = useTransactionModal();

  const { data, isLoading, error } = useQuery({
    queryKey: ["category-report", from, to, categoryId],
    queryFn: () => apiClient.categoryReport(from, to, categoryId ?? undefined),
    enabled: isOpen
  });

  if (!isOpen) return null;

  const transactions = data?.transactions ?? [];
  const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <Modal title={categoryName} onClose={onClose}>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : transactions.length === 0 ? (
        <EmptyState label={t("noData")} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <div className="flex justify-between items-center text-[13px] text-on-surface-variant pb-2 border-b border-border-subtle">
            <span>{t("total")} ({transactions.length} {transactions.length === 1 ? t("transaction") : t("transactions")})</span>
            <span className="font-semibold font-data-mono">{formatMoney(totalAmount, currency, locale)}</span>
          </div>

          {/* Transaction list */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden flex flex-col shadow-sm divide-y divide-border-subtle/50">
            {transactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                showDate={true}
                showCategory={false}
                onClick={() => openEdit(tx.id)}
              />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}