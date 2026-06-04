import type { Account, AccountType, Transaction, TransactionType } from "../types/domain";

export const standardConsumptionTypes = new Set<TransactionType>(["expense"]);

export function isLiquidAccount(type: AccountType): boolean {
  return type === "cash" || type === "bank" || type === "savings";
}

export function calculateAvailableCash(accounts: Account[]): number {
  return accounts.filter((account) => account.is_active && isLiquidAccount(account.type)).reduce((sum, account) => sum + account.current_balance, 0);
}

export function calculateNetWorth(accounts: Account[], activeLoanReceivable = 0, activeDebts = 0): number {
  const liquidAndSavings = accounts
    .filter((account) => account.is_active && (account.type === "cash" || account.type === "bank" || account.type === "savings"))
    .reduce((sum, account) => sum + account.current_balance, 0);

  const creditCardLiability = accounts
    .filter((account) => account.is_active && account.type === "credit_card")
    .reduce((sum, account) => sum + Math.abs(Math.min(account.current_balance, 0)), 0);

  return liquidAndSavings + activeLoanReceivable - creditCardLiability - activeDebts;
}

export interface BalanceEffect {
  accountId: string;
  delta: number;
}

export function getBalanceEffects(transaction: Pick<Transaction, "type" | "amount" | "account_id" | "destination_account_id">): BalanceEffect[] {
  const { type, amount, account_id: accountId, destination_account_id: destinationAccountId } = transaction;

  switch (type) {
    case "income":
      return [{ accountId, delta: amount }];
    case "expense":
      return [{ accountId, delta: -amount }];
    case "loan":
      return [{ accountId, delta: -amount }];
    case "debt":
      return [{ accountId, delta: amount }];
    case "debt_collection":
      return [{ accountId, delta: amount }];
    case "repayment":
      return [{ accountId, delta: -amount }];
    case "transfer":
      if (!destinationAccountId) {
        return [{ accountId, delta: -amount }];
      }
      return [
        { accountId, delta: -amount },
        { accountId: destinationAccountId, delta: amount }
      ];
  }
}

export function reverseEffects(effects: BalanceEffect[]): BalanceEffect[] {
  return effects.map((effect) => ({ accountId: effect.accountId, delta: -effect.delta }));
}

export function isReportableExpense(type: TransactionType): boolean {
  return standardConsumptionTypes.has(type);
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`;
  return { from, to };
}
