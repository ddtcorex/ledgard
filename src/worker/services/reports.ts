import { calculateAvailableCash, calculateNetWorth } from "../../shared/finance/calculations";
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
  const recentTransactions = await listTransactions(env, { limit: 10 });
  const liabilities = await getDebtAndLoanTotals(env);

  // Use SQL aggregate queries to avoid fetching all transactions (which would hit 200 limit)
  const [cashflow, categoryDistribution, memberContribution] = await Promise.all([
    getCashflowFromDb(env, from, to),
    getCategoryDistributionFromDb(env, from, to),
    getMemberContributionFromDb(env, from, to)
  ]);

  return {
    available_cash: calculateAvailableCash(accounts),
    net_worth: calculateNetWorth(accounts, liabilities.activeLoans, liabilities.activeDebts),
    liquid_breakdown: accounts
      .filter((account) => account.is_active && (account.type === "cash" || account.type === "bank" || account.type === "savings"))
      .map((account) => ({ account_id: account.id, name: account.name, type: account.type, balance: account.current_balance })),
    category_distribution: categoryDistribution,
    member_contribution: memberContribution,
    cashflow: cashflow,
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

async function getCashflowFromDb(env: Env, from: string, to: string): Promise<OverviewReport["cashflow"]> {
  const rows = await all<{ date: string; income: number; expense: number }>(
    env.DB,
    `
      SELECT
        transaction_date AS date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE transaction_date >= ?1 AND transaction_date <= ?2
        AND type IN ('income', 'expense')
      GROUP BY transaction_date
      ORDER BY transaction_date ASC
    `,
    from,
    to
  );
  return rows;
}

async function getCategoryDistributionFromDb(env: Env, from: string, to: string): Promise<OverviewReport["category_distribution"]> {
  const rows = await all<{ category_id: string; name: string; amount: number; color: string | null }>(
    env.DB,
    `
      SELECT
        c.id AS category_id,
        c.name,
        SUM(t.amount) AS amount,
        c.color
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date >= ?1 AND t.transaction_date <= ?2
        AND t.type = 'expense'
        AND c.id IS NOT NULL
      GROUP BY c.id
      ORDER BY amount DESC
    `,
    from,
    to
  );
  return rows;
}

async function getMemberContributionFromDb(env: Env, from: string, to: string): Promise<OverviewReport["member_contribution"]> {
  const rows = await all<{ member_id: string; name: string; amount: number }>(
    env.DB,
    `
      SELECT
        m.id AS member_id,
        m.name,
        SUM(t.amount) AS amount
      FROM transactions t
      JOIN members m ON t.member_id = m.id
      WHERE t.transaction_date >= ?1 AND t.transaction_date <= ?2
        AND t.type = 'expense'
      GROUP BY m.id
      ORDER BY amount DESC
    `,
    from,
    to
  );
  return rows;
}

async function getIncomeExpenseTotals(env: Env, from: string, to: string): Promise<{ income: number; expense: number }> {
  const row = await first<{ income: number; expense: number }>(
    env.DB,
    `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE transaction_date >= ?1 AND transaction_date <= ?2
    `,
    from,
    to
  );
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}

export async function getIncomeExpenseReport(
  env: Env,
  from: string,
  to: string,
  compareFrom?: string,
  compareTo?: string
): Promise<IncomeExpenseData> {
  // Use SQL aggregation for totals - no 200 limit issue
  const currentTotals = await getIncomeExpenseTotals(env, from, to);
  const current = {
    income: currentTotals.income,
    expense: currentTotals.expense,
    net: currentTotals.income - currentTotals.expense
  };

  if (compareFrom && compareTo) {
    const compareTotals = await getIncomeExpenseTotals(env, compareFrom, compareTo);
    const comparison = {
      income: compareTotals.income,
      expense: compareTotals.expense,
      net: compareTotals.income - compareTotals.expense,
      incomeChange: 0,
      expenseChange: 0,
      netChange: 0
    };
    comparison.incomeChange = comparison.income === 0 ? 0 : ((current.income - comparison.income) / comparison.income) * 100;
    comparison.expenseChange = comparison.expense === 0 ? 0 : ((current.expense - comparison.expense) / comparison.expense) * 100;
    comparison.netChange = comparison.net === 0 ? 0 : ((current.net - comparison.net) / comparison.net) * 100;

    return { current, comparison };
  }

  return { current };
}

interface CategorySummary {
  category_id: string;
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

async function getCategoryTotalsFromDb(env: Env, from: string, to: string): Promise<CategorySummary[]> {
  const rows = await all<{ category_id: string; name: string; amount: number; count: number }>(
    env.DB,
    `
      SELECT
        c.id AS category_id,
        c.name,
        SUM(t.amount) AS amount,
        COUNT(*) AS count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date >= ?1 AND t.transaction_date <= ?2
        AND t.type = 'expense'
        AND c.id IS NOT NULL
      GROUP BY c.id
      ORDER BY amount DESC
    `,
    from,
    to
  );

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  return rows.map((r) => ({
    ...r,
    percentage: totalAmount === 0 ? 0 : (r.amount / totalAmount) * 100
  }));
}

export async function getCategoryReport(env: Env, from: string, to: string, categoryId?: string): Promise<CategoryReportData> {
  // If drill-down into specific category, return transactions for that category
  if (categoryId) {
    // Use listTransactions for drill-down with its cursor-based pagination
    const transactions = await listTransactions(env, { from, to, category_id: categoryId, limit: 200 });
    return { categories: [], transactions };
  }

  // Use SQL aggregation for category summary - no 200 limit issue
  const categories = await getCategoryTotalsFromDb(env, from, to);
  return { categories };
}

export async function getMemberReport(env: Env, from: string, to: string): Promise<MemberReportData> {
  // Use SQL aggregation to get member totals with category breakdown
  const rows = await all<{
    member_id: string;
    member_name: string;
    category_id: string | null;
    category_name: string | null;
    amount: number;
  }>(
    env.DB,
    `
      SELECT
        m.id AS member_id,
        m.name AS member_name,
        c.id AS category_id,
        c.name AS category_name,
        COALESCE(SUM(t.amount), 0) AS amount
      FROM transactions t
      JOIN members m ON t.member_id = m.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date >= ?1 AND t.transaction_date <= ?2
        AND t.type = 'expense'
      GROUP BY m.id, c.id
      ORDER BY m.id, amount DESC
    `,
    from,
    to
  );

  // Group by member
  const memberMap = new Map<string, {
    member_id: string;
    name: string;
    total: number;
    categories: { category_id: string; category_name: string; amount: number }[];
  }>();
  let grandTotal = 0;

  for (const row of rows) {
    let member = memberMap.get(row.member_id);
    if (!member) {
      member = { member_id: row.member_id, name: row.member_name, total: 0, categories: [] };
      memberMap.set(row.member_id, member);
    }
    member.total += row.amount;
    grandTotal += row.amount;
    member.categories.push({
      category_id: row.category_id ?? "uncategorized",
      category_name: row.category_name ?? "Uncategorized",
      amount: row.amount
    });
  }

  const members = [...memberMap.values()]
    .map((member) => ({
      member_id: member.member_id,
      name: member.name,
      total: member.total,
      percentage: grandTotal === 0 ? 0 : (member.total / grandTotal) * 100,
      categories: member.categories.sort((a, b) => b.amount - a.amount)
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
