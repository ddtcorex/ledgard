export type LocaleCode = "en" | "vi";

export type CurrencyCode = "USD" | "VND" | "EUR" | "GBP" | "JPY" | "SGD" | "AUD" | "CAD";

export type MemberRole = "admin" | "member";

export type AccountType = "cash" | "bank" | "credit_card" | "savings";

export type CategoryType = "income" | "expense";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "loan"
  | "debt"
  | "debt_collection"
  | "repayment";

export type ScheduledFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RecurringBudgetFrequency = "monthly" | "quarterly" | "yearly";

export type BudgetSource = "manual" | "recurring" | "template";

export interface SystemSettings {
  global_lock_until_date: string;
  default_locale: LocaleCode;
  default_currency: CurrencyCode;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar_url: string | null;
  is_active: number;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  currency: CurrencyCode;
  is_active: number;
  created_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  is_active: number;
}

export interface CategoryTreeNode extends Category {
  children: Category[];
}

export interface Transaction {
  id: string;
  amount: number;
  currency: CurrencyCode;
  type: TransactionType;
  account_id: string;
  destination_account_id: string | null;
  member_id: string;
  category_id: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionView extends Transaction {
  account_name: string;
  destination_account_name: string | null;
  member_name: string;
  category_name: string | null;
  category_icon: string | null;
  category_type: CategoryType | null;
  parent_category_id: string | null;
  parent_category_name: string | null;
}

export interface Budget {
  id: string;
  category_id: string;
  member_id: string | null;
  amount: number;
  currency: CurrencyCode;
  period_month: number;
  period_year: number;
  source: BudgetSource;
  recurring_budget_id: string | null;
  created_at: string;
}

export interface BudgetView extends Budget {
  category_name: string;
  category_type: CategoryType;
  category_icon: string | null;
  category_parent_id: string | null;
  member_name: string | null;
  spent: number;
  remaining: number;
  progress: number;
}

export interface ScheduledTransaction {
  id: string;
  account_id: string;
  destination_account_id: string | null;
  member_id: string;
  category_id: string | null;
  amount: number;
  currency: CurrencyCode;
  type: TransactionType;
  frequency: ScheduledFrequency;
  interval_day: number;
  description: string | null;
  is_active: number;
  next_run_date: string;
  created_at: string;
}

export interface RecurringBudget {
  id: string;
  category_id: string;
  member_id: string | null;
  amount: number;
  currency: CurrencyCode;
  frequency: RecurringBudgetFrequency;
  start_month: number;
  start_year: number;
  end_month: number | null;
  end_year: number | null;
  is_active: number;
  next_run_month: number;
  next_run_year: number;
  created_at: string;
  category_name?: string;
  member_name?: string | null;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_shared: number;
  created_at: string;
}

export interface BudgetTemplateItem {
  id: string;
  template_id: string;
  category_id: string;
  member_id: string | null;
  amount: number;
  currency: CurrencyCode;
  category_name?: string;
  member_name?: string | null;
}

export interface OverviewReport {
  available_cash: number;
  net_worth: number;
  liquid_breakdown: Array<{ account_id: string; name: string; type: AccountType; balance: number }>;
  category_distribution: Array<{ category_id: string; name: string; amount: number; color: string | null }>;
  member_contribution: Array<{ member_id: string; name: string; amount: number }>;
  cashflow: Array<{ date: string; income: number; expense: number }>;
  recent_transactions: TransactionView[];
}

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface IncomeExpenseData {
  current: {
    income: number;
    expense: number;
    net: number;
  };
  comparison?: {
    income: number;
    expense: number;
    net: number;
    incomeChange: number;
    expenseChange: number;
    netChange: number;
  };
}

export interface CategoryReportData {
  categories: Array<{
    category_id: string;
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  transactions?: TransactionView[];
}

export interface MemberReportData {
  members: Array<{
    member_id: string;
    name: string;
    total: number;
    percentage: number;
    categories: Array<{
      category_id: string;
      category_name: string;
      amount: number;
    }>;
  }>;
}
