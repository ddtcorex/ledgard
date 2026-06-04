import type { CurrencyCode, ScheduledFrequency, ScheduledTransaction } from "../../shared/types/domain";
import { createId, first, run } from "../db/d1";
import type { Env } from "../env";
import { createTransaction } from "./transactions";

export async function listScheduledTransactions(env: Env): Promise<ScheduledTransaction[]> {
  const result = await env.DB.prepare("SELECT * FROM scheduled_transactions ORDER BY is_active DESC, next_run_date ASC").all<ScheduledTransaction>();
  return result.results ?? [];
}

export async function createScheduledTransaction(
  env: Env,
  input: Omit<ScheduledTransaction, "id" | "created_at" | "is_active"> & { is_active?: number }
): Promise<ScheduledTransaction> {
  const id = createId("sch");
  await run(
    env.DB,
    `INSERT INTO scheduled_transactions
      (id, account_id, destination_account_id, member_id, category_id, amount, currency, type, frequency, interval_day, description, is_active, next_run_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.account_id,
    input.destination_account_id ?? null,
    input.member_id,
    input.category_id ?? null,
    input.amount,
    input.currency,
    input.type,
    input.frequency,
    input.interval_day,
    input.description ?? null,
    input.is_active ?? 1,
    input.next_run_date
  );
  const created = await first<ScheduledTransaction>(env.DB, "SELECT * FROM scheduled_transactions WHERE id = ?", id);
  if (!created) {
    throw new Error("NOT_FOUND: Scheduled transaction was not created.");
  }
  return created;
}

export async function updateScheduledTransaction(
  env: Env,
  id: string,
  patch: Partial<{
    account_id: string;
    destination_account_id: string | null;
    member_id: string;
    category_id: string | null;
    amount: number;
    currency: CurrencyCode;
    type: "income" | "expense" | "transfer";
    frequency: ScheduledFrequency;
    interval_day: number;
    description: string | null;
    is_active: number;
    next_run_date: string;
  }>
): Promise<ScheduledTransaction> {
  const current = await first<ScheduledTransaction>(env.DB, "SELECT * FROM scheduled_transactions WHERE id = ?", id);
  if (!current) {
    throw new Error("NOT_FOUND: Scheduled transaction not found.");
  }
  await run(
    env.DB,
    `UPDATE scheduled_transactions
     SET account_id = ?, destination_account_id = ?, member_id = ?, category_id = ?, amount = ?, currency = ?, type = ?, frequency = ?, interval_day = ?, description = ?, is_active = ?, next_run_date = ?
     WHERE id = ?`,
    patch.account_id ?? current.account_id,
    patch.destination_account_id === undefined ? current.destination_account_id : patch.destination_account_id,
    patch.member_id ?? current.member_id,
    patch.category_id === undefined ? current.category_id : patch.category_id,
    patch.amount ?? current.amount,
    patch.currency ?? current.currency,
    patch.type ?? current.type,
    patch.frequency ?? current.frequency,
    patch.interval_day ?? current.interval_day,
    patch.description === undefined ? current.description : patch.description,
    patch.is_active ?? current.is_active,
    patch.next_run_date ?? current.next_run_date,
    id
  );
  const updated = await first<ScheduledTransaction>(env.DB, "SELECT * FROM scheduled_transactions WHERE id = ?", id);
  if (!updated) {
    throw new Error("NOT_FOUND: Scheduled transaction not found.");
  }
  return updated;
}

export async function deleteScheduledTransaction(env: Env, id: string): Promise<{ id: string }> {
  await run(env.DB, "DELETE FROM scheduled_transactions WHERE id = ?", id);
  return { id };
}

export async function runScheduledTransactions(env: Env, today = new Date().toISOString().slice(0, 10)): Promise<{ processed: number }> {
  const dueResult = await env.DB.prepare("SELECT * FROM scheduled_transactions WHERE is_active = 1 AND next_run_date <= ? ORDER BY next_run_date ASC").bind(today).all<ScheduledTransaction>();
  const due = dueResult.results ?? [];
  let processed = 0;

  for (const item of due) {
    const runId = `${item.id}_${item.next_run_date}`;
    const existingRun = await first<{ id: string }>(env.DB, "SELECT id FROM scheduled_transaction_runs WHERE id = ?", runId);
    if (existingRun) {
      await updateScheduledTransaction(env, item.id, { next_run_date: nextRunDate(item.next_run_date, item.frequency, item.interval_day) });
      continue;
    }

    const transaction = await createTransaction(env, {
      amount: item.amount,
      currency: item.currency,
      type: item.type,
      account_id: item.account_id,
      destination_account_id: item.destination_account_id,
      member_id: item.member_id,
      category_id: item.category_id,
      description: item.description ? `${item.description} (scheduled)` : "Scheduled transaction",
      transaction_date: item.next_run_date
    });

    await run(env.DB, "INSERT INTO scheduled_transaction_runs (id, scheduled_transaction_id, run_date, transaction_id) VALUES (?, ?, ?, ?)", runId, item.id, item.next_run_date, transaction.id);
    await updateScheduledTransaction(env, item.id, { next_run_date: nextRunDate(item.next_run_date, item.frequency, item.interval_day) });
    processed += 1;
  }

  return { processed };
}

function nextRunDate(date: string, frequency: ScheduledFrequency, intervalDay: number): string {
  const current = new Date(`${date}T00:00:00.000Z`);
  if (frequency === "daily") {
    current.setUTCDate(current.getUTCDate() + Math.max(intervalDay, 1));
  }
  if (frequency === "weekly") {
    current.setUTCDate(current.getUTCDate() + 7);
  }
  if (frequency === "monthly") {
    current.setUTCMonth(current.getUTCMonth() + 1);
    current.setUTCDate(Math.min(intervalDay, daysInMonth(current.getUTCFullYear(), current.getUTCMonth() + 1)));
  }
  if (frequency === "yearly") {
    current.setUTCFullYear(current.getUTCFullYear() + 1);
    current.setUTCDate(Math.min(intervalDay, daysInMonth(current.getUTCFullYear(), current.getUTCMonth() + 1)));
  }
  return current.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
