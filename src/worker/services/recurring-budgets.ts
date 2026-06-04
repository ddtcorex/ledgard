import type { CurrencyCode } from "../../shared/types/domain";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";
import { createBudget } from "./budgets";

export interface RecurringBudget {
  id: string;
  category_id: string;
  member_id: string | null;
  amount: number;
  currency: CurrencyCode;
  frequency: "monthly" | "quarterly" | "yearly";
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

export async function listRecurringBudgets(env: Env): Promise<RecurringBudget[]> {
  return await all<RecurringBudget>(
    env.DB,
    `SELECT
      rb.*,
      c.name AS category_name,
      m.name AS member_name
    FROM recurring_budgets rb
    JOIN categories c ON c.id = rb.category_id
    LEFT JOIN members m ON m.id = rb.member_id
    ORDER BY rb.is_active DESC, rb.next_run_year ASC, rb.next_run_month ASC`
  );
}

export async function createRecurringBudget(
  env: Env,
  input: {
    category_id: string;
    member_id?: string | null;
    amount: number;
    currency: CurrencyCode;
    frequency: "monthly" | "quarterly" | "yearly";
    start_month: number;
    start_year: number;
    end_month?: number | null;
    end_year?: number | null;
  }
): Promise<RecurringBudget> {
  const id = createId("rbud");

  await run(
    env.DB,
    `INSERT INTO recurring_budgets
     (id, category_id, member_id, amount, currency, frequency, start_month, start_year,
      end_month, end_year, next_run_month, next_run_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.category_id,
    input.member_id ?? null,
    input.amount,
    input.currency,
    input.frequency,
    input.start_month,
    input.start_year,
    input.end_month ?? null,
    input.end_year ?? null,
    input.start_month,
    input.start_year
  );

  const created = await first<RecurringBudget>(
    env.DB,
    "SELECT * FROM recurring_budgets WHERE id = ?",
    id
  );

  if (!created) {
    throw new Error("NOT_FOUND: Recurring budget was not created.");
  }

  return created;
}

export async function updateRecurringBudget(
  env: Env,
  id: string,
  patch: Partial<{
    amount: number;
    is_active: number;
    end_month: number | null;
    end_year: number | null;
  }>
): Promise<RecurringBudget> {
  const current = await first<RecurringBudget>(
    env.DB,
    "SELECT * FROM recurring_budgets WHERE id = ?",
    id
  );

  if (!current) {
    throw new Error("NOT_FOUND: Recurring budget not found.");
  }

  await run(
    env.DB,
    `UPDATE recurring_budgets
     SET amount = ?, is_active = ?, end_month = ?, end_year = ?
     WHERE id = ?`,
    patch.amount ?? current.amount,
    patch.is_active ?? current.is_active,
    patch.end_month === undefined ? current.end_month : patch.end_month,
    patch.end_year === undefined ? current.end_year : patch.end_year,
    id
  );

  const updated = await first<RecurringBudget>(
    env.DB,
    "SELECT * FROM recurring_budgets WHERE id = ?",
    id
  );

  if (!updated) {
    throw new Error("NOT_FOUND: Recurring budget not found.");
  }

  return updated;
}

export async function deleteRecurringBudget(env: Env, id: string): Promise<{ id: string }> {
  await run(env.DB, "DELETE FROM recurring_budgets WHERE id = ?", id);
  return { id };
}

export async function runRecurringBudgets(
  env: Env,
  targetYear: number,
  targetMonth: number
): Promise<{ processed: number }> {
  const due = await all<RecurringBudget>(
    env.DB,
    `SELECT * FROM recurring_budgets
     WHERE is_active = 1
     AND (next_run_year < ? OR (next_run_year = ? AND next_run_month <= ?))
     AND (end_year IS NULL OR end_year > ? OR (end_year = ? AND end_month >= ?))
     ORDER BY next_run_year ASC, next_run_month ASC`,
    targetYear,
    targetYear,
    targetMonth,
    targetYear,
    targetYear,
    targetMonth
  );

  let processed = 0;

  for (const recurring of due) {
    const runId = `${recurring.id}_${targetYear}_${targetMonth}`;

    const existingRun = await first<{ id: string }>(
      env.DB,
      "SELECT id FROM recurring_budget_runs WHERE id = ?",
      runId
    );

    if (existingRun) {
      await advanceNextRun(env, recurring);
      continue;
    }

    const budget = await createBudget(env, {
      category_id: recurring.category_id,
      member_id: recurring.member_id,
      amount: recurring.amount,
      currency: recurring.currency,
      period_month: targetMonth,
      period_year: targetYear
    });

    await run(
      env.DB,
      "UPDATE budgets SET source = 'recurring', recurring_budget_id = ? WHERE id = ?",
      recurring.id,
      budget.id
    );

    await run(
      env.DB,
      "INSERT INTO recurring_budget_runs (id, recurring_budget_id, run_year, run_month, budget_id) VALUES (?, ?, ?, ?, ?)",
      runId,
      recurring.id,
      targetYear,
      targetMonth,
      budget.id
    );

    await advanceNextRun(env, recurring);
    processed += 1;
  }

  return { processed };
}

async function advanceNextRun(env: Env, recurring: RecurringBudget): Promise<void> {
  const { next_run_year, next_run_month, frequency } = recurring;
  let newYear = next_run_year;
  let newMonth = next_run_month;

  if (frequency === "monthly") {
    newMonth += 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
  } else if (frequency === "quarterly") {
    newMonth += 3;
    if (newMonth > 12) {
      newMonth -= 12;
      newYear += 1;
    }
  } else if (frequency === "yearly") {
    newYear += 1;
  }

  await run(
    env.DB,
    "UPDATE recurring_budgets SET next_run_year = ?, next_run_month = ? WHERE id = ?",
    newYear,
    newMonth,
    recurring.id
  );
}
