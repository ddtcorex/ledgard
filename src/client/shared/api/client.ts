import type {
  Account,
  Budget,
  BudgetTemplate,
  BudgetTemplateItem,
  BudgetView,
  Category,
  CategoryReportData,
  CurrencyCode,
  IncomeExpenseData,
  Member,
  MemberReportData,
  OverviewReport,
  RecurringBudget,
  ScheduledTransaction,
  SystemSettings,
  Transaction,
  TransactionView
} from "../../../shared/types/domain";
import { notifySessionExpired } from "../components/SessionExpired";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
  }
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {})
      },
      ...init
    });
  } catch {
    // Network error — likely CF Access redirecting to login page
    // (browser follows the redirect but the response isn't valid JSON)
    notifySessionExpired();
    throw new ApiClientError("Session expired", "UNAUTHORIZED", 401);
  }

  // Cloudflare Access may return 401 directly
  if (response.status === 401) {
    notifySessionExpired();
    throw new ApiClientError("Session expired", "UNAUTHORIZED", 401);
  }

  const body = (await response.json().catch(() => null)) as { data?: unknown; error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    throw new ApiClientError(body?.error?.message ?? "Request failed", body?.error?.code ?? "REQUEST_FAILED", response.status);
  }
  return body?.data as T;
}

export const apiClient = {
  me: () => fetchApi<Member>("/me"),
  settings: () => fetchApi<SystemSettings>("/settings"),
  updateSettings: (input: Partial<SystemSettings>) => fetchApi<SystemSettings>("/settings", { method: "PATCH", body: JSON.stringify(input) }),
  members: () => fetchApi<Member[]>("/members"),
  createMember: (input: Pick<Member, "name" | "email" | "role">) => fetchApi<Member>("/members", { method: "POST", body: JSON.stringify(input) }),
  updateMember: (id: string, input: Partial<Pick<Member, "name" | "email" | "role" | "avatar_url" | "is_active">>) =>
    fetchApi<Member>(`/members/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  accounts: () => fetchApi<Account[]>("/accounts"),
  createAccount: (input: { name: string; type: Account["type"]; initial_balance: number; currency: CurrencyCode }) =>
    fetchApi<Account>("/accounts", { method: "POST", body: JSON.stringify(input) }),
  updateAccount: (id: string, input: Partial<Pick<Account, "name" | "type" | "initial_balance" | "currency" | "is_active">>) =>
    fetchApi<Account>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteAccount: (id: string) => fetchApi<{ id: string }>(`/accounts/${id}`, { method: "DELETE" }),
  deleteMember: (id: string) => fetchApi<{ id: string }>(`/members/${id}`, { method: "DELETE" }),
  categories: () => fetchApi<Category[]>("/categories"),
  createCategory: (input: { name: string; type: Category["type"]; parent_id?: string | null; icon?: string | null; color?: string | null }) =>
    fetchApi<Category>("/categories", { method: "POST", body: JSON.stringify(input) }),
  updateCategory: (id: string, input: Partial<Pick<Category, "name" | "icon" | "color" | "is_active">>) =>
    fetchApi<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteCategory: (id: string) => fetchApi<{ id: string }>(`/categories/${id}`, { method: "DELETE" }),
  transactions: (params = "") => fetchApi<TransactionView[]>(`/transactions${params}`),
  transaction: (id: string) => fetchApi<TransactionView>(`/transactions/${id}`),
  createTransaction: (input: Omit<Transaction, "id" | "created_at" | "updated_at">) =>
    fetchApi<Transaction>("/transactions", { method: "POST", body: JSON.stringify(input) }),
  updateTransaction: (id: string, input: Omit<Transaction, "id" | "created_at" | "updated_at">) =>
    fetchApi<Transaction>(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteTransaction: (id: string) => fetchApi<{ id: string }>(`/transactions/${id}`, { method: "DELETE" }),
  budgets: (year: number, month: number) => fetchApi<BudgetView[]>(`/budgets?year=${year}&month=${month}`),
  createBudget: (input: { category_id: string; member_id?: string | null; amount: number; currency: CurrencyCode; period_month: number; period_year: number }) =>
    fetchApi("/budgets", { method: "POST", body: JSON.stringify(input) }),
  updateBudget: (id: string, input: Partial<{ category_id: string; member_id: string | null; amount: number; currency: CurrencyCode; period_month: number; period_year: number }>) =>
    fetchApi<Budget>(`/budgets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteBudget: (id: string) => fetchApi<{ id: string }>(`/budgets/${id}`, { method: "DELETE" }),
  overview: (from: string, to: string) => fetchApi<OverviewReport>(`/reports/overview?from=${from}&to=${to}`),
  reportTransactions: (from: string, to: string) => fetchApi<TransactionView[]>(`/reports/transactions?from=${from}&to=${to}`),
  incomeExpenseReport: (from: string, to: string, compareFrom?: string, compareTo?: string) => {
    const params = new URLSearchParams({ from, to });
    if (compareFrom) params.append("compareFrom", compareFrom);
    if (compareTo) params.append("compareTo", compareTo);
    return fetchApi<IncomeExpenseData>(`/reports/income-expense?${params}`);
  },
  categoryReport: (from: string, to: string, categoryId?: string) => {
    const params = new URLSearchParams({ from, to });
    if (categoryId) params.append("categoryId", categoryId);
    return fetchApi<CategoryReportData>(`/reports/categories?${params}`);
  },
  memberReport: (from: string, to: string) => fetchApi<MemberReportData>(`/reports/members?from=${from}&to=${to}`),
  debtReport: (from: string, to: string) => fetchApi<{
    loansGiven: Array<{ id: string; type: "loan" | "debt" | "debt_collection" | "repayment"; amount: number; description: string | null; member_name: string; account_name: string; transaction_date: string }>;
    debtsOwed: Array<{ id: string; type: "loan" | "debt" | "debt_collection" | "repayment"; amount: number; description: string | null; member_name: string; account_name: string; transaction_date: string }>;
    collectionsReceived: Array<{ id: string; type: "loan" | "debt" | "debt_collection" | "repayment"; amount: number; description: string | null; member_name: string; account_name: string; transaction_date: string }>;
    repaymentsMade: Array<{ id: string; type: "loan" | "debt" | "debt_collection" | "repayment"; amount: number; description: string | null; member_name: string; account_name: string; transaction_date: string }>;
    totalLoansGiven: number;
    totalDebtsOwed: number;
    totalCollections: number;
    totalRepayments: number;
    netReceivable: number;
    netPayable: number;
  }>(`/reports/debts?from=${from}&to=${to}`),
  scheduled: () => fetchApi<ScheduledTransaction[]>("/scheduled-transactions"),
  createScheduled: (input: Omit<ScheduledTransaction, "id" | "created_at">) =>
    fetchApi<ScheduledTransaction>("/scheduled-transactions", { method: "POST", body: JSON.stringify(input) }),
  updateScheduled: (id: string, input: Partial<Omit<ScheduledTransaction, "id" | "created_at">>) =>
    fetchApi<ScheduledTransaction>(`/scheduled-transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteScheduled: (id: string) => fetchApi<{ id: string }>(`/scheduled-transactions/${id}`, { method: "DELETE" }),
  recurringBudgets: () => fetchApi<RecurringBudget[]>("/recurring-budgets"),
  createRecurringBudget: (input: Omit<RecurringBudget, "id" | "created_at" | "is_active" | "next_run_month" | "next_run_year" | "category_name" | "member_name">) =>
    fetchApi<RecurringBudget>("/recurring-budgets", { method: "POST", body: JSON.stringify(input) }),
  updateRecurringBudget: (id: string, input: Partial<Pick<RecurringBudget, "amount" | "is_active" | "end_month" | "end_year">>) =>
    fetchApi<RecurringBudget>(`/recurring-budgets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteRecurringBudget: (id: string) => fetchApi<{ id: string }>(`/recurring-budgets/${id}`, { method: "DELETE" }),
  budgetTemplates: () => fetchApi<BudgetTemplate[]>("/budget-templates"),
  budgetTemplateItems: (id: string) => fetchApi<BudgetTemplateItem[]>(`/budget-templates/${id}/items`),
  createBudgetTemplate: (input: Omit<BudgetTemplate, "id" | "created_at"> & { items: Array<Omit<BudgetTemplateItem, "id" | "template_id" | "category_name" | "member_name">> }) =>
    fetchApi<BudgetTemplate>("/budget-templates", { method: "POST", body: JSON.stringify(input) }),
  updateBudgetTemplate: (id: string, input: Partial<Pick<BudgetTemplate, "name" | "description" | "is_shared">>) =>
    fetchApi<BudgetTemplate>(`/budget-templates/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteBudgetTemplate: (id: string) => fetchApi<{ id: string }>(`/budget-templates/${id}`, { method: "DELETE" }),
  applyBudgetTemplate: (id: string, data: { target_year: number; target_month: number }) =>
    fetchApi<{ created: number }>(`/budget-templates/${id}/apply`, { method: "POST", body: JSON.stringify(data) })
};
