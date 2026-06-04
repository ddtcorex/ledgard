import type { Account, AccountType, CurrencyCode } from "../../shared/types/domain";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";

export async function listAccounts(env: Env): Promise<Account[]> {
  return all<Account>(env.DB, "SELECT * FROM accounts ORDER BY is_active DESC, type ASC, name ASC");
}

export async function createAccount(env: Env, input: { name: string; type: AccountType; initial_balance: number; currency: CurrencyCode }): Promise<Account> {
  const id = createId("acc");
  await run(
    env.DB,
    "INSERT INTO accounts (id, name, type, initial_balance, current_balance, currency) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    input.name,
    input.type,
    input.initial_balance,
    input.initial_balance,
    input.currency
  );
  const account = await first<Account>(env.DB, "SELECT * FROM accounts WHERE id = ?", id);
  if (!account) {
    throw new Error("NOT_FOUND: Account was not created.");
  }
  return account;
}

export async function updateAccount(
  env: Env,
  id: string,
  patch: Partial<{ name: string; type: AccountType; initial_balance: number; currency: CurrencyCode; is_active: number }>
): Promise<Account> {
  const current = await first<Account>(env.DB, "SELECT * FROM accounts WHERE id = ?", id);
  if (!current) {
    throw new Error("NOT_FOUND: Account not found.");
  }

  const newInitialBalance = patch.initial_balance ?? current.initial_balance;
  const balanceDiff = newInitialBalance - current.initial_balance;
  const newCurrentBalance = current.current_balance + balanceDiff;

  await run(
    env.DB,
    "UPDATE accounts SET name = ?, type = ?, initial_balance = ?, current_balance = ?, currency = ?, is_active = ? WHERE id = ?",
    patch.name ?? current.name,
    patch.type ?? current.type,
    newInitialBalance,
    newCurrentBalance,
    patch.currency ?? current.currency,
    patch.is_active ?? current.is_active,
    id
  );

  const updated = await first<Account>(env.DB, "SELECT * FROM accounts WHERE id = ?", id);
  if (!updated) {
    throw new Error("NOT_FOUND: Account not found.");
  }
  return updated;
}

export async function deleteAccount(env: Env, id: string): Promise<boolean> {
  const linked = await first<{ count: number }>(
    env.DB,
    "SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR destination_account_id = ?",
    id,
    id
  );
  if (linked && linked.count > 0) {
    throw new Error("VALIDATION_ERROR: Cannot delete account because it has linked transactions.");
  }

  await run(env.DB, "DELETE FROM accounts WHERE id = ?", id);
  return true;
}
