import { monthRange } from "../../shared/finance/calculations";
import type { Budget, BudgetView, Category, CurrencyCode } from "../../shared/types/domain";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";

export async function listBudgets(env: Env, year: number, month: number): Promise<BudgetView[]> {
  const budgets = await all<BudgetView>(
    env.DB,
    `
      SELECT
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.type AS category_type,
        c.parent_id AS category_parent_id,
        m.name AS member_name,
        0 AS spent,
        b.amount AS remaining,
        0 AS progress
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN members m ON m.id = b.member_id
      WHERE b.period_year = ? AND b.period_month = ?
      ORDER BY b.member_id IS NOT NULL ASC, c.name ASC
    `,
    year,
    month
  );

  const range = monthRange(year, month);
  return Promise.all(
    budgets.map(async (budget) => {
      const spent = await calculateBudgetSpent(env, budget.category_id, budget.member_id, range.from, range.to);
      const progress = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        progress
      };
    })
  );
}

export async function createBudget(
  env: Env,
  input: { category_id: string; member_id?: string | null; amount: number; currency: CurrencyCode; period_month: number; period_year: number }
): Promise<Budget> {
  await validateBudget(env, input);
  const id = createId("bud");
  await run(
    env.DB,
    "INSERT INTO budgets (id, category_id, member_id, amount, currency, period_month, period_year) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id,
    input.category_id,
    input.member_id ?? null,
    input.amount,
    input.currency,
    input.period_month,
    input.period_year
  );
  const budget = await first<Budget>(env.DB, "SELECT * FROM budgets WHERE id = ?", id);
  if (!budget) {
    throw new Error("NOT_FOUND: Budget was not created.");
  }
  return budget;
}

export async function updateBudget(
  env: Env,
  id: string,
  patch: Partial<{ category_id: string; member_id: string | null; amount: number; currency: CurrencyCode; period_month: number; period_year: number }>
): Promise<Budget> {
  const current = await first<Budget>(env.DB, "SELECT * FROM budgets WHERE id = ?", id);
  if (!current) {
    throw new Error("NOT_FOUND: Budget not found.");
  }
  const next = {
    category_id: patch.category_id ?? current.category_id,
    member_id: patch.member_id === undefined ? current.member_id : patch.member_id,
    amount: patch.amount ?? current.amount,
    currency: patch.currency ?? current.currency,
    period_month: patch.period_month ?? current.period_month,
    period_year: patch.period_year ?? current.period_year
  };
  await validateBudget(env, next);
  await run(
    env.DB,
    "UPDATE budgets SET category_id = ?, member_id = ?, amount = ?, currency = ?, period_month = ?, period_year = ? WHERE id = ?",
    next.category_id,
    next.member_id,
    next.amount,
    next.currency,
    next.period_month,
    next.period_year,
    id
  );
  const updated = await first<Budget>(env.DB, "SELECT * FROM budgets WHERE id = ?", id);
  if (!updated) {
    throw new Error("NOT_FOUND: Budget not found.");
  }
  return updated;
}

export async function deleteBudget(env: Env, id: string): Promise<{ id: string }> {
  await run(env.DB, "DELETE FROM budgets WHERE id = ?", id);
  return { id };
}

async function validateBudget(
  env: Env,
  input: { category_id: string; member_id?: string | null; amount: number; period_month: number; period_year: number }
): Promise<void> {
  if (input.amount <= 0) {
    throw new Error("VALIDATION_ERROR: Budget amount must be positive.");
  }
  if (input.period_month < 1 || input.period_month > 12) {
    throw new Error("VALIDATION_ERROR: Budget month must be between 1 and 12.");
  }
  const category = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ? AND is_active = 1", input.category_id);
  if (!category || category.type !== "expense") {
    throw new Error("VALIDATION_ERROR: Budget category must be an active expense category.");
  }
  if (input.member_id) {
    const member = await first<{ id: string }>(env.DB, "SELECT id FROM members WHERE id = ? AND is_active = 1", input.member_id);
    if (!member) {
      throw new Error("VALIDATION_ERROR: Budget member not found or inactive.");
    }
  }
}

async function calculateBudgetSpent(env: Env, categoryId: string, memberId: string | null, from: string, to: string): Promise<number> {
  const category = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ?", categoryId);
  if (!category) {
    return 0;
  }

  const categoryClause = category.parent_id ? "t.category_id = ?" : "(t.category_id = ? OR c.parent_id = ?)";
  const categoryBindings = category.parent_id ? [categoryId] : [categoryId, categoryId];
  const memberClause = memberId ? "AND t.member_id = ?" : "";
  const memberBindings = memberId ? [memberId] : [];
  const row = await first<{ spent: number }>(
    env.DB,
    `
      SELECT COALESCE(SUM(t.amount), 0) AS spent
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.type = 'expense'
        AND t.transaction_date BETWEEN ? AND ?
        AND ${categoryClause}
        ${memberClause}
    `,
    from,
    to,
    ...categoryBindings,
    ...memberBindings
  );
  return row?.spent ?? 0;
}
