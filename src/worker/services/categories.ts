import type { Category, CategoryTreeNode, CategoryType } from "../../shared/types/domain";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";

export async function listCategories(env: Env): Promise<Category[]> {
  return all<Category>(env.DB, "SELECT * FROM categories ORDER BY type ASC, parent_id ASC, name ASC");
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  return categories
    .filter((category) => category.parent_id === null)
    .map((category) => ({
      ...category,
      children: categories.filter((child) => child.parent_id === category.id)
    }));
}

export async function createCategory(
  env: Env,
  input: { parent_id?: string | null; name: string; type: CategoryType; icon?: string | null; color?: string | null }
): Promise<Category> {
  if (input.parent_id) {
    const parent = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ?", input.parent_id);
    if (!parent) {
      throw new Error("VALIDATION_ERROR: Parent category not found.");
    }
    if (parent.parent_id) {
      throw new Error("VALIDATION_ERROR: Category hierarchy is limited to two levels.");
    }
    if (parent.type !== input.type) {
      throw new Error("VALIDATION_ERROR: Child category type must match parent type.");
    }
  }

  const id = createId("cat");
  await run(env.DB, "INSERT INTO categories (id, parent_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)", id, input.parent_id ?? null, input.name, input.type, input.icon ?? null, input.color ?? null);
  const category = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ?", id);
  if (!category) {
    throw new Error("NOT_FOUND: Category was not created.");
  }
  return category;
}

export async function updateCategory(
  env: Env,
  id: string,
  patch: Partial<{ name: string; icon: string | null; color: string | null; is_active: number }>
): Promise<Category> {
  const current = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ?", id);
  if (!current) {
    throw new Error("NOT_FOUND: Category not found.");
  }

  await run(
    env.DB,
    "UPDATE categories SET name = ?, icon = ?, color = ?, is_active = ? WHERE id = ?",
    patch.name ?? current.name,
    patch.icon === undefined ? current.icon : patch.icon,
    patch.color === undefined ? current.color : patch.color,
    patch.is_active ?? current.is_active,
    id
  );

  const updated = await first<Category>(env.DB, "SELECT * FROM categories WHERE id = ?", id);
  if (!updated) {
    throw new Error("NOT_FOUND: Category not found.");
  }
  return updated;
}

export async function deleteCategory(env: Env, id: string): Promise<boolean> {
  const children = await first<{ count: number }>(env.DB, "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?", id);
  if (children && children.count > 0) {
    throw new Error("VALIDATION_ERROR: Cannot delete a category that has child categories.");
  }

  const linkedTx = await first<{ count: number }>(env.DB, "SELECT COUNT(*) as count FROM transactions WHERE category_id = ?", id);
  if (linkedTx && linkedTx.count > 0) {
    throw new Error("VALIDATION_ERROR: Cannot delete category because it has linked transactions.");
  }

  const linkedBudgets = await first<{ count: number }>(env.DB, "SELECT COUNT(*) as count FROM budgets WHERE category_id = ?", id);
  if (linkedBudgets && linkedBudgets.count > 0) {
    throw new Error("VALIDATION_ERROR: Cannot delete category because it has linked budgets.");
  }

  const linkedScheduled = await first<{ count: number }>(env.DB, "SELECT COUNT(*) as count FROM scheduled_transactions WHERE category_id = ?", id);
  if (linkedScheduled && linkedScheduled.count > 0) {
    throw new Error("VALIDATION_ERROR: Cannot delete category because it has linked scheduled transactions.");
  }

  await run(env.DB, "DELETE FROM categories WHERE id = ?", id);
  return true;
}
