const DEFAULT_ICONS: Record<string, string> = {
  income: "payments",
  expense: "receipt_long",
  transfer: "swap_horiz",
  loan: "account_balance",
  debt: "account_balance",
  debt_collection: "savings",
  repayment: "credit_score",
};

export function getCategoryIcon(icon: string | null, type: string): string {
  return icon || DEFAULT_ICONS[type] || "category";
}
