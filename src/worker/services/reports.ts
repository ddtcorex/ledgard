import { calculateAvailableCash, calculateNetWorth, isReportableExpense } from "../../shared/finance/calculations";
import type { Account, CategoryReportData, IncomeExpenseData, MemberReportData, OverviewReport, TransactionView } from "../../shared/types/domain";
import { all, first } from "../db/d1";
import type { Env } from "../env";
import { listAccounts } from "./accounts";
import { listTransactions } from "./transactions";

interface LoanDebtItem {
  id: string;
  type: "loan" | "debt" | "debt_collection" | "repayment";
  amount: number;
  description: string | null;
  member_name: string;
  account_name: string;
  transaction_date: string;
}

interface DebtReportResult {
  loansGiven: LoanDebtItem[];
  debtsOwed: LoanDebtItem[];
  collectionsReceived: LoanDebtItem[];
  repaymentsMade: LoanDebtItem[];
  totalLoansGiven: number;
  totalDebtsOwed: number;
  totalCollections: number;
  totalRepayments: number;
  netReceivable: number;  // loansGiven - collectionsReceived
  netPayable: number;      // debtsOwed - repaymentsMade
}

export async function getDebtReport(env: Env, from: string, to: string): Promise<DebtReportResult> {
  const rows = await all<LoanDebtItem>(
    env.DB,
    `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        m.name AS member_name,
        a.name AS account_name,
        t.transaction_date
      FROM transactions t
      JOIN members m ON t.member_id = m.id
      JOIN accounts a ON t.account_id = a.id
      WHERE t.type IN ('loan', 'debt', 'debt_collection', 'repayment')
        AND t.transaction_date >= ?1
        AND t.transaction_date <= ?2
      ORDER BY t.transaction_date DESC
    `,
    from,
    to
  );

  const loansGiven = rows.filter((r) => r.type === "loan");
  const debtsOwed = rows.filter((r) => r.type === "debt");
  const collectionsReceived = rows.filter((r) => r.type === "debt_collection");
  const repaymentsMade = rows.filter((r) => r.type === "repayment");

  const totalLoansGiven = loansGiven.reduce((sum, r) => sum + r.amount, 0);
  const totalDebtsOwed = debtsOwed.reduce((sum, r) => sum + r.amount, 0);
  const totalCollections = collectionsReceived.reduce((sum, r) => sum + r.amount, 0);
  const totalRepayments = repaymentsMade.reduce((sum, r) => sum + r.amount, 0);

  return {
    loansGiven,
    debtsOwed,
    collectionsReceived,
    repaymentsMade,
    totalLoansGiven,
    totalDebtsOwed,
    totalCollections,
    totalRepayments,
    netReceivable: totalLoansGiven - totalCollections,
    netPayable: totalDebtsOwed - totalRepayments
  };
}

export async function getOverviewReport(env: Env, from: string, to: string): Promise<OverviewReport> {
  const accounts = await listAccounts(env);
  const transactions = await listTransactions(env, { from, to, limit: 500 });
  const recentTransactions = await listTransactions(env, { limit: 10 });
  const liabilities = await getDebtAndLoanTotals(env);

  return {
    available_cash: calculateAvailableCash(accounts),
    net_worth: calculateNetWorth(accounts, liabilities.activeLoans, liabilities.activeDebts),
    liquid_breakdown: accounts
      .filter((account) => account.is_active && (account.type === "cash" || account.type === "bank" || account.type === "savings"))
      .map((account) => ({ account_id: account.id, name: account.name, type: account.type, balance: account.current_balance })),
    category_distribution: buildCategoryDistribution(transactions),
    member_contribution: buildMemberContribution(transactions),
    cashflow: buildCashflow(transactions),
    recent_transactions: recentTransactions
  };
}

export async function getReportTransactions(env: Env, from: string, to: string): Promise<TransactionView[]> {
  return listTransactions(env, { from, to, limit: 500 });
}

export async function getAccountsSnapshot(env: Env): Promise<Account[]> {
  return listAccounts(env);
}

async function getDebtAndLoanTotals(env: Env): Promise<{ activeLoans: number; activeDebts: number }> {
  const row = await first<{ loans: number; collections: number; debts: number; repayments: number }>(
    env.DB,
    `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'loan' THEN amount ELSE 0 END), 0) AS loans,
        COALESCE(SUM(CASE WHEN type = 'debt_collection' THEN amount ELSE 0 END), 0) AS collections,
        COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END), 0) AS debts,
        COALESCE(SUM(CASE WHEN type = 'repayment' THEN amount ELSE 0 END), 0) AS repayments
      FROM transactions
    `
  );
  return {
    activeLoans: Math.max((row?.loans ?? 0) - (row?.collections ?? 0), 0),
    activeDebts: Math.max((row?.debts ?? 0) - (row?.repayments ?? 0), 0)
  };
}

function buildCategoryDistribution(transactions: TransactionView[]): OverviewReport["category_distribution"] {
  const map = new Map<string, { category_id: string; name: string; amount: number; color: string | null }>();
  for (const transaction of transactions) {
    if (!isReportableExpense(transaction.type) || !transaction.category_id) {
      continue;
    }
    // Use actual category_id (child category) instead of parent for detailed view
    const id = transaction.category_id;
    const name = transaction.category_name ?? "Uncategorized";
    const current = map.get(id) ?? { category_id: id, name, amount: 0, color: null };
    current.amount += transaction.amount;
    map.set(id, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function buildMemberContribution(transactions: TransactionView[]): OverviewReport["member_contribution"] {
  const map = new Map<string, { member_id: string; name: string; amount: number }>();
  for (const transaction of transactions) {
    if (!isReportableExpense(transaction.type)) {
      continue;
    }
    const current = map.get(transaction.member_id) ?? { member_id: transaction.member_id, name: transaction.member_name, amount: 0 };
    current.amount += transaction.amount;
    map.set(transaction.member_id, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function buildCashflow(transactions: TransactionView[]): OverviewReport["cashflow"] {
  const map = new Map<string, { date: string; income: number; expense: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== "income" && transaction.type !== "expense") {
      continue;
    }
    const current = map.get(transaction.transaction_date) ?? { date: transaction.transaction_date, income: 0, expense: 0 };
    if (transaction.type === "income") {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }
    map.set(transaction.transaction_date, current);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getIncomeExpenseReport(
  env: Env,
  from: string,
  to: string,
  compareFrom?: string,
  compareTo?: string
): Promise<IncomeExpenseData> {
  const transactions = await listTransactions(env, { from, to, limit: 1000 });

  const current = {
    income: transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
    expense: transactions.filter((t) => isReportableExpense(t.type)).reduce((sum, t) => sum + t.amount, 0),
    net: 0
  };
  current.net = current.income - current.expense;

  if (compareFrom && compareTo) {
    const compareTransactions = await listTransactions(env, { from: compareFrom, to: compareTo, limit: 1000 });
    const comparison = {
      income: compareTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
      expense: compareTransactions.filter((t) => isReportableExpense(t.type)).reduce((sum, t) => sum + t.amount, 0),
      net: 0,
      incomeChange: 0,
      expenseChange: 0,
      netChange: 0
    };
    comparison.net = comparison.income - comparison.expense;
    comparison.incomeChange = comparison.income === 0 ? 0 : ((current.income - comparison.income) / comparison.income) * 100;
    comparison.expenseChange = comparison.expense === 0 ? 0 : ((current.expense - comparison.expense) / comparison.expense) * 100;
    comparison.netChange = comparison.net === 0 ? 0 : ((current.net - comparison.net) / comparison.net) * 100;

    return { current, comparison };
  }

  return { current };
}

export async function getCategoryReport(env: Env, from: string, to: string, categoryId?: string): Promise<CategoryReportData> {
  const transactions = await listTransactions(env, { from, to, limit: 1000 });

  if (categoryId) {
    const categoryTransactions = transactions.filter((t) => t.category_id === categoryId);
    return { categories: [], transactions: categoryTransactions };
  }

  const map = new Map<string, { category_id: string; name: string; amount: number; count: number }>();
  let totalAmount = 0;

  for (const transaction of transactions) {
    if (!isReportableExpense(transaction.type) || !transaction.category_id) {
      continue;
    }
    const id = transaction.category_id;
    const name = transaction.category_name ?? "Uncategorized";
    const current = map.get(id) ?? { category_id: id, name, amount: 0, count: 0 };
    current.amount += transaction.amount;
    current.count += 1;
    totalAmount += transaction.amount;
    map.set(id, current);
  }

  const categories = [...map.values()]
    .map((cat) => ({
      ...cat,
      percentage: totalAmount === 0 ? 0 : (cat.amount / totalAmount) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  return { categories };
}

export async function getMemberReport(env: Env, from: string, to: string): Promise<MemberReportData> {
  const transactions = await listTransactions(env, { from, to, limit: 1000 });

  const memberMap = new Map<
    string,
    { member_id: string; name: string; total: number; categories: Map<string, { category_id: string; category_name: string; amount: number }> }
  >();
  let totalAmount = 0;

  for (const transaction of transactions) {
    if (!isReportableExpense(transaction.type)) {
      continue;
    }

    const memberId = transaction.member_id;
    const memberName = transaction.member_name;
    const categoryId = transaction.category_id ?? "uncategorized";
    const categoryName = transaction.category_name ?? "Uncategorized";

    const member = memberMap.get(memberId) ?? {
      member_id: memberId,
      name: memberName,
      total: 0,
      categories: new Map()
    };

    member.total += transaction.amount;
    totalAmount += transaction.amount;

    const category = member.categories.get(categoryId) ?? { category_id: categoryId, category_name: categoryName, amount: 0 };
    category.amount += transaction.amount;
    member.categories.set(categoryId, category);

    memberMap.set(memberId, member);
  }

  const members = [...memberMap.values()]
    .map((member) => ({
      member_id: member.member_id,
      name: member.name,
      total: member.total,
      percentage: totalAmount === 0 ? 0 : (member.total / totalAmount) * 100,
      categories: [...member.categories.values()].sort((a, b) => b.amount - a.amount)
    }))
    .sort((a, b) => b.total - a.total);

  return { members };
}

export async function getExportData(env: Env, from: string, to: string, type: string): Promise<Record<string, unknown>[]> {
  if (type === "transactions") {
    const transactions = await listTransactions(env, { from, to, limit: 5000 });
    return transactions.map((t) => ({
      Date: t.transaction_date,
      Type: t.type,
      Amount: t.amount,
      Account: t.account_name,
      Destination: t.destination_account_name ?? "",
      Member: t.member_name,
      Category: t.category_name ?? "",
      Description: t.description ?? ""
    }));
  }

  if (type === "categories") {
    const report = await getCategoryReport(env, from, to);
    return report.categories.map((c) => ({
      Category: c.name,
      Amount: c.amount,
      Count: c.count,
      Percentage: c.percentage.toFixed(2)
    }));
  }

  if (type === "members") {
    const report = await getMemberReport(env, from, to);
    return report.members.flatMap((m) =>
      m.categories.map((c) => ({
        Member: m.name,
        Category: c.category_name,
        Amount: c.amount,
        MemberTotal: m.total,
        Percentage: m.percentage.toFixed(2)
      }))
    );
  }

  return [];
}

export function generateCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => {
    const value = row[header];
    const stringValue = value === null || value === undefined ? "" : String(value);
    return stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")
      ? `"${stringValue.replace(/"/g, '""')}"`
      : stringValue;
  }).join(","));

  return [headers.join(","), ...rows].join("\n");
}

export function generateExcel(data: Record<string, unknown>[]): ArrayBuffer {
  // Placeholder for Excel generation - requires xlsx library
  // For now, return CSV as fallback
  const csv = generateCSV(data);
  const encoder = new TextEncoder();
  return encoder.encode(csv).buffer;
}
