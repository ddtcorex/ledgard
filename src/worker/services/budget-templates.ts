import type { CurrencyCode } from "../../shared/types/domain";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";
import { createBudget } from "./budgets";

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

export async function listBudgetTemplates(env: Env, memberId: string): Promise<BudgetTemplate[]> {
  return await all<BudgetTemplate>(
    env.DB,
    `SELECT * FROM budget_templates
     WHERE created_by = ? OR is_shared = 1
     ORDER BY created_at DESC`,
    memberId
  );
}

export async function getBudgetTemplate(env: Env, id: string): Promise<BudgetTemplate> {
  const template = await first<BudgetTemplate>(
    env.DB,
    "SELECT * FROM budget_templates WHERE id = ?",
    id
  );

  if (!template) {
    throw new Error("NOT_FOUND: Budget template not found.");
  }

  return template;
}

export async function getBudgetTemplateItems(env: Env, templateId: string): Promise<BudgetTemplateItem[]> {
  return await all<BudgetTemplateItem>(
    env.DB,
    `SELECT
      bti.*,
      c.name AS category_name,
      m.name AS member_name
    FROM budget_template_items bti
    JOIN categories c ON c.id = bti.category_id
    LEFT JOIN members m ON m.id = bti.member_id
    WHERE bti.template_id = ?
    ORDER BY c.name ASC`,
    templateId
  );
}

export async function createBudgetTemplate(
  env: Env,
  input: {
    name: string;
    description?: string | null;
    created_by: string;
    is_shared?: number;
    items: Array<{
      category_id: string;
      member_id?: string | null;
      amount: number;
      currency: CurrencyCode;
    }>;
  }
): Promise<BudgetTemplate> {
  const id = createId("btpl");

  await run(
    env.DB,
    "INSERT INTO budget_templates (id, name, description, created_by, is_shared) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name,
    input.description ?? null,
    input.created_by,
    input.is_shared ?? 0
  );

  for (const item of input.items) {
    const itemId = createId("btpi");
    await run(
      env.DB,
      "INSERT INTO budget_template_items (id, template_id, category_id, member_id, amount, currency) VALUES (?, ?, ?, ?, ?, ?)",
      itemId,
      id,
      item.category_id,
      item.member_id ?? null,
      item.amount,
      item.currency
    );
  }

  return await getBudgetTemplate(env, id);
}

export async function updateBudgetTemplate(
  env: Env,
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    is_shared: number;
  }>
): Promise<BudgetTemplate> {
  const current = await getBudgetTemplate(env, id);

  await run(
    env.DB,
    "UPDATE budget_templates SET name = ?, description = ?, is_shared = ? WHERE id = ?",
    patch.name ?? current.name,
    patch.description === undefined ? current.description : patch.description,
    patch.is_shared ?? current.is_shared,
    id
  );

  return await getBudgetTemplate(env, id);
}

export async function deleteBudgetTemplate(env: Env, id: string): Promise<{ id: string }> {
  await run(env.DB, "DELETE FROM budget_templates WHERE id = ?", id);
  return { id };
}

export async function applyBudgetTemplate(
  env: Env,
  templateId: string,
  targetYear: number,
  targetMonth: number
): Promise<{ created: number }> {
  const items = await getBudgetTemplateItems(env, templateId);

  let created = 0;

  for (const item of items) {
    const existing = await first<{ id: string }>(
      env.DB,
      `SELECT id FROM budgets
       WHERE category_id = ?
       AND (member_id IS ? OR (member_id IS NULL AND ? IS NULL))
       AND period_year = ?
       AND period_month = ?`,
      item.category_id,
      item.member_id,
      item.member_id,
      targetYear,
      targetMonth
    );

    if (!existing) {
      const budget = await createBudget(env, {
        category_id: item.category_id,
        member_id: item.member_id,
        amount: item.amount,
        currency: item.currency,
        period_month: targetMonth,
        period_year: targetYear
      });

      await run(
        env.DB,
        "UPDATE budgets SET source = 'template' WHERE id = ?",
        budget.id
      );

      created += 1;
    }
  }

  return { created };
}
