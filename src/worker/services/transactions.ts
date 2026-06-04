import { getBalanceEffects, reverseEffects } from "../../shared/finance/calculations";
import type { Category, CurrencyCode, Transaction, TransactionType, TransactionView } from "../../shared/types/domain";
import { viTranslations, removeDiacritics, generateVietnameseVariations } from "../../shared/i18n/translations";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";

export interface TransactionInput {
  amount: number;
  currency: CurrencyCode;
  type: TransactionType;
  account_id: string;
  destination_account_id?: string | null;
  member_id: string;
  category_id?: string | null;
  description?: string | null;
  transaction_date: string;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  type?: TransactionType;
  account_id?: string;
  member_id?: string;
  category_id?: string;
  search?: string;
  limit?: number;
  cursor?: number;
}

export async function listTransactions(env: Env, filters: TransactionFilters = {}): Promise<TransactionView[]> {
  const clauses: string[] = [];
  const bindings: unknown[] = [];

  if (filters.from) {
    clauses.push("t.transaction_date >= ?");
    bindings.push(filters.from);
  }
  if (filters.to) {
    clauses.push("t.transaction_date <= ?");
    bindings.push(filters.to);
  }
  if (filters.type) {
    clauses.push("t.type = ?");
    bindings.push(filters.type);
  }
  if (filters.account_id) {
    clauses.push("(t.account_id = ? OR t.destination_account_id = ?)");
    bindings.push(filters.account_id, filters.account_id);
  }
  if (filters.member_id) {
    clauses.push("t.member_id = ?");
    bindings.push(filters.member_id);
  }
  if (filters.category_id) {
    clauses.push("(t.category_id = ? OR parent.id = ?)");
    bindings.push(filters.category_id, filters.category_id);
  }
  if (filters.search) {
    // Start with the original search term and its Vietnamese character variations
    const searchTerms = new Set<string>([filters.search]);

    // Add Vietnamese character variations (e.g., "an sang" → "ăn sang", "ăn săng")
    const variations = generateVietnameseVariations(filters.search);
    variations.forEach(v => searchTerms.add(v));

    // Find English equivalents for Vietnamese search terms (diacritic-insensitive)
    const normalizedSearch = removeDiacritics(filters.search.toLowerCase());
    for (const [english, vietnamese] of Object.entries(viTranslations)) {
      const normalizedVietnamese = removeDiacritics(vietnamese.toLowerCase());
      if (normalizedVietnamese.includes(normalizedSearch)) {
        searchTerms.add(english);
      }
    }

    // Build OR conditions for each search term
    const searchConditions: string[] = [];
    for (const term of Array.from(searchTerms)) {
      searchConditions.push("(lower(t.description) LIKE lower(?) OR lower(c.name) LIKE lower(?) OR lower(m.name) LIKE lower(?))");
      const searchPattern = `%${term}%`;
      bindings.push(searchPattern, searchPattern, searchPattern);
    }

    clauses.push(`(${searchConditions.join(" OR ")})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 200);
  const offset = Math.max(filters.cursor ?? 0, 0);

  return all<TransactionView>(
    env.DB,
    `
      SELECT
        t.*,
        a.name AS account_name,
        da.name AS destination_account_name,
        m.name AS member_name,
        c.name AS category_name,
        c.icon AS category_icon,
        c.type AS category_type,
        parent.id AS parent_category_id,
        parent.name AS parent_category_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts da ON da.id = t.destination_account_id
      JOIN members m ON m.id = t.member_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      ${where}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `,
    ...bindings,
    limit,
    offset
  );
}

export async function getTransaction(env: Env, id: string): Promise<Transaction | null> {
  return first<Transaction>(env.DB, "SELECT * FROM transactions WHERE id = ?", id);
}

export async function getTransactionView(env: Env, id: string): Promise<TransactionView> {
  const transaction = await first<TransactionView>(
    env.DB,
    `
      SELECT
        t.*,
        a.name AS account_name,
        da.name AS destination_account_name,
        m.name AS member_name,
        c.name AS category_name,
        c.icon AS category_icon,
        c.type AS category_type,
        parent.id AS parent_category_id,
        parent.name AS parent_category_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts da ON da.id = t.destination_account_id
      JOIN members m ON m.id = t.member_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      WHERE t.id = ?
      LIMIT 1
    `,
    id
  );
  if (!transaction) {
    throw new Error("NOT_FOUND: Transaction not found.");
  }
  return transaction;
}

export async function createTransaction(env: Env, input: TransactionInput): Promise<Transaction> {
  await validateTransactionInput(env, input);
  await assertUnlocked(env, input.transaction_date);
  const id = createId("tx");
  const transaction: Transaction = {
    id,
    amount: input.amount,
    currency: input.currency,
    type: input.type,
    account_id: input.account_id,
    destination_account_id: input.destination_account_id ?? null,
    member_id: input.member_id,
    category_id: input.category_id ?? null,
    description: input.description ?? null,
    transaction_date: input.transaction_date,
    created_at: "",
    updated_at: ""
  };

  const effects = getBalanceEffects(transaction);
  const statements = [
    env.DB.prepare(
      `INSERT INTO transactions
        (id, amount, currency, type, account_id, destination_account_id, member_id, category_id, description, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      input.amount,
      input.currency,
      input.type,
      input.account_id,
      input.destination_account_id ?? null,
      input.member_id,
      input.category_id ?? null,
      input.description ?? null,
      input.transaction_date
    ),
    ...effects.map((effect) => env.DB.prepare("UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?").bind(effect.delta, effect.accountId))
  ];

  await env.DB.batch(statements);
  const created = await getTransaction(env, id);
  if (!created) {
    throw new Error("NOT_FOUND: Transaction was not created.");
  }
  return created;
}

export async function updateTransaction(env: Env, id: string, input: TransactionInput): Promise<Transaction> {
  const existing = await getTransaction(env, id);
  if (!existing) {
    throw new Error("NOT_FOUND: Transaction not found.");
  }

  await validateTransactionInput(env, input);
  await assertUnlocked(env, existing.transaction_date);
  await assertUnlocked(env, input.transaction_date);

  const next: Transaction = {
    ...existing,
    amount: input.amount,
    currency: input.currency,
    type: input.type,
    account_id: input.account_id,
    destination_account_id: input.destination_account_id ?? null,
    member_id: input.member_id,
    category_id: input.category_id ?? null,
    description: input.description ?? null,
    transaction_date: input.transaction_date
  };

  const effects = [...reverseEffects(getBalanceEffects(existing)), ...getBalanceEffects(next)];
  const statements = [
    env.DB.prepare(
      `UPDATE transactions
       SET amount = ?, currency = ?, type = ?, account_id = ?, destination_account_id = ?, member_id = ?, category_id = ?, description = ?, transaction_date = ?
       WHERE id = ?`
    ).bind(
      input.amount,
      input.currency,
      input.type,
      input.account_id,
      input.destination_account_id ?? null,
      input.member_id,
      input.category_id ?? null,
      input.description ?? null,
      input.transaction_date,
      id
    ),
    ...effects.map((effect) => env.DB.prepare("UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?").bind(effect.delta, effect.accountId))
  ];

  await env.DB.batch(statements);
  const updated = await getTransaction(env, id);
  if (!updated) {
    throw new Error("NOT_FOUND: Transaction not found.");
  }
  return updated;
}

export async function deleteTransaction(env: Env, id: string): Promise<{ id: string }> {
  const existing = await getTransaction(env, id);
  if (!existing) {
    throw new Error("NOT_FOUND: Transaction not found.");
  }

  await assertUnlocked(env, existing.transaction_date);
  const effects = reverseEffects(getBalanceEffects(existing));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id),
    ...effects.map((effect) => env.DB.prepare("UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?").bind(effect.delta, effect.accountId))
  ]);
  return { id };
}

export async function assertUnlocked(env: Env, transactionDate: string): Promise<void> {
  const setting = await first<{ value: string }>(env.DB, "SELECT value FROM system_settings WHERE key = 'global_lock_until_date'");
  const lockDate = setting?.value ?? "1970-01-01";
  if (transactionDate <= lockDate) {
    throw new Error("MUTATION_BLOCKED: Financial records for this period are locked by system administrator.");
  }
}

async function validateTransactionInput(env: Env, input: TransactionInput): Promise<void> {
  if (input.amount <= 0) {
    throw new Error("VALIDATION_ERROR: Amount must be positive.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transaction_date)) {
    throw new Error("VALIDATION_ERROR: Transaction date must use YYYY-MM-DD.");
  }

  const source = await first<{ id: string }>(env.DB, "SELECT id FROM accounts WHERE id = ? AND is_active = 1", input.account_id);
  if (!source) {
    throw new Error("VALIDATION_ERROR: Source account not found or inactive.");
  }

  const member = await first<{ id: string }>(env.DB, "SELECT id FROM members WHERE id = ? AND is_active = 1", input.member_id);
  if (!member) {
    throw new Error("VALIDATION_ERROR: Member not found or inactive.");
  }

  if (input.type === "transfer") {
    if (!input.destination_account_id) {
      throw new Error("VALIDATION_ERROR: Transfer requires destination account.");
    }
    if (input.destination_account_id === input.account_id) {
      throw new Error("VALIDATION_ERROR: Transfer destination must differ from source.");
    }
    const destination = await first<{ id: string }>(env.DB, "SELECT id FROM accounts WHERE id = ? AND is_active = 1", input.destination_account_id);
    if (!destination) {
      throw new Error("VALIDATION_ERROR: Destination account not found or inactive.");
    }
    return;
  }

  if (input.type === "income" || input.type === "expense") {
    if (!input.category_id) {
      throw new Error("VALIDATION_ERROR: Income and expense transactions require a child category.");
    }
    const category = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ? AND is_active = 1", input.category_id);
    if (!category) {
      throw new Error("VALIDATION_ERROR: Category not found or inactive.");
    }
    if (!category.parent_id) {
      throw new Error("VALIDATION_ERROR: Transactions must be assigned to child categories.");
    }
    if (category.type !== input.type) {
      throw new Error("VALIDATION_ERROR: Transaction type must match category type.");
    }
  }
}
