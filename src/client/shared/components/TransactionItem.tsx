import { Lock } from "lucide-react";
import { formatMoney } from "../../../shared/finance/money";
import type { TransactionView } from "../../../shared/types/domain";
import { displayText } from "../i18n/display";
import { useI18n } from "../i18n/I18nProvider";
import { formatDate } from "../lib/dates";
import { getCategoryIcon } from "../lib/categories";

interface TransactionItemProps {
  transaction: TransactionView;
  showDate?: boolean;
  showCategory?: boolean;
  locked?: boolean;
  onClick?: () => void;
}

export function TransactionItem({
  transaction,
  showDate = true,
  showCategory = true,
  locked = false,
  onClick
}: TransactionItemProps) {
  const { t, locale } = useI18n();

  const isIncome = transaction.type === "income" || transaction.type === "debt_collection" || transaction.type === "debt";
  const isTransfer = transaction.type === "transfer";
  const amtSign = isIncome ? "+" : isTransfer ? "" : "-";
  const amountClass = isIncome ? "text-success-emerald" : isTransfer ? "text-primary" : "text-danger-crisp";

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between gap-3 p-3 border-b border-border-subtle/50 last:border-0 transition-colors ${
        onClick ? "cursor-pointer active:bg-surface-container-low hover:bg-surface-muted" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
          <span className="material-symbols-outlined text-[18px]">
            {getCategoryIcon(transaction.category_icon, transaction.category_type ?? transaction.type)}
          </span>
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <h4 className="text-[14px] font-medium text-on-surface truncate">
            {displayText(transaction.description, locale) || t(transaction.type)}
          </h4>
          <p className="text-[12px] text-on-surface-variant truncate pr-2">
            {showCategory && transaction.category_name ? `${displayText(transaction.category_name, locale)} · ` : ""}
            {displayText(transaction.account_name, locale)}
            {transaction.member_name ? ` · ${transaction.member_name}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="flex items-center gap-1">
          {locked && <Lock size={12} className="text-warning-orange" />}
          <span className={`text-[14px] font-semibold font-data-mono ${amountClass}`}>
            {amtSign}{formatMoney(transaction.amount, transaction.currency, locale)}
          </span>
        </div>
        {showDate && (
          <span className="text-[11px] text-on-surface-variant">
            {formatDate(transaction.transaction_date, locale)}
          </span>
        )}
      </div>
    </div>
  );
}
