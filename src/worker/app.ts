import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Env, Variables } from "./env";
import { authenticate, requestContext, requireAdmin } from "./middleware/auth";
import { errorHandler } from "./middleware/errors";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "./services/accounts";
import { createBudget, deleteBudget, listBudgets, updateBudget } from "./services/budgets";
import { applyBudgetTemplate, createBudgetTemplate, deleteBudgetTemplate, getBudgetTemplateItems, listBudgetTemplates, updateBudgetTemplate } from "./services/budget-templates";
import { buildCategoryTree, createCategory, listCategories, updateCategory, deleteCategory } from "./services/categories";
import { createRecurringBudget, deleteRecurringBudget, listRecurringBudgets, updateRecurringBudget } from "./services/recurring-budgets";
import { createMember, deleteMember, listMembers, updateMember } from "./services/members";
import { migrateAvatarsForExistingMembers } from "./services/migrate-avatars";
import { getCategoryReport, getDebtReport, getExportData, getIncomeExpenseReport, getMemberReport, getOverviewReport, getReportTransactions, generateCSV, generateExcel } from "./services/reports";
import { createScheduledTransaction, deleteScheduledTransaction, listScheduledTransactions, updateScheduledTransaction } from "./services/scheduled";
import { getSettings, updateSettings } from "./services/settings";
import { createTransaction, deleteTransaction, getTransactionView, listTransactions, updateTransaction } from "./services/transactions";
import {
  accountCreateSchema,
  accountUpdateSchema,
  budgetCreateSchema,
  budgetTemplateApplySchema,
  budgetTemplateCreateSchema,
  budgetTemplateUpdateSchema,
  budgetUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  dateSchema,
  memberCreateSchema,
  memberUpdateSchema,
  recurringBudgetCreateSchema,
  recurringBudgetUpdateSchema,
  scheduledCreateSchema,
  scheduledUpdateSchema,
  settingsPatchSchema,
  transactionInputSchema,
  transactionTypeSchema
} from "./validation/schemas";

function routeId(id: string | undefined): string {
  if (!id) {
    throw new Error("VALIDATION_ERROR: Missing route id.");
  }
  return id;
}

export const api = new Hono<{ Bindings: Env; Variables: Variables }>().basePath("/api");

api.use("*", requestContext);
api.use("*", authenticate);
api.onError(errorHandler);

api.get("/health", (c) =>
  c.json({
    data: {
      ok: true,
      service: "ledgard",
      timestamp: new Date().toISOString()
    }
  })
);

api.get("/me", (c) => c.json({ data: c.get("member") }));

api.get("/settings", async (c) => c.json({ data: await getSettings(c.env) }));
api.patch("/settings", requireAdmin, zValidator("json", settingsPatchSchema), async (c) => c.json({ data: await updateSettings(c.env, c.req.valid("json")) }));

api.get("/members", async (c) => c.json({ data: await listMembers(c.env) }));
api.post("/members", requireAdmin, zValidator("json", memberCreateSchema), async (c) => c.json({ data: await createMember(c.env, c.req.valid("json")) }, 201));
api.patch("/members/:id", requireAdmin, zValidator("json", memberUpdateSchema), async (c) => c.json({ data: await updateMember(c.env, c.req.param("id"), c.req.valid("json")) }));
api.delete("/members/:id", requireAdmin, async (c) => c.json({ data: await deleteMember(c.env, routeId(c.req.param("id"))) }));
api.post("/members/migrate-avatars", requireAdmin, async (c) => c.json({ data: await migrateAvatarsForExistingMembers(c.env) }));

api.get("/accounts", async (c) => c.json({ data: await listAccounts(c.env) }));
api.post("/accounts", requireAdmin, zValidator("json", accountCreateSchema), async (c) => c.json({ data: await createAccount(c.env, c.req.valid("json")) }, 201));
api.patch("/accounts/:id", requireAdmin, zValidator("json", accountUpdateSchema), async (c) => c.json({ data: await updateAccount(c.env, c.req.param("id"), c.req.valid("json")) }));
api.delete("/accounts/:id", requireAdmin, async (c) => c.json({ data: await deleteAccount(c.env, routeId(c.req.param("id"))) }));

api.get("/categories", async (c) => {
  const categories = await listCategories(c.env);
  return c.json({ data: categories, meta: { tree: buildCategoryTree(categories) } });
});
api.post("/categories", requireAdmin, zValidator("json", categoryCreateSchema), async (c) => c.json({ data: await createCategory(c.env, c.req.valid("json")) }, 201));
api.patch("/categories/:id", requireAdmin, zValidator("json", categoryUpdateSchema), async (c) => c.json({ data: await updateCategory(c.env, c.req.param("id"), c.req.valid("json")) }));
api.delete("/categories/:id", requireAdmin, async (c) => c.json({ data: await deleteCategory(c.env, c.req.param("id") as string) }));

api.get("/transactions", async (c) => {
  const query = c.req.query();
  const type = query.type ? transactionTypeSchema.parse(query.type) : undefined;
  const limit = query.limit ? Number(query.limit) : undefined;
  const cursor = query.cursor ? Number(query.cursor) : undefined;
  return c.json({
    data: await listTransactions(c.env, {
      from: query.from,
      to: query.to,
      type,
      account_id: query.account_id,
      member_id: query.member_id,
      category_id: query.category_id,
      search: query.search,
      limit,
      cursor
    })
  });
});
api.post("/transactions", zValidator("json", transactionInputSchema), async (c) => c.json({ data: await createTransaction(c.env, c.req.valid("json")) }, 201));
api.get("/transactions/:id", async (c) => c.json({ data: await getTransactionView(c.env, routeId(c.req.param("id"))) }));
api.patch("/transactions/:id", zValidator("json", transactionInputSchema), async (c) => c.json({ data: await updateTransaction(c.env, c.req.param("id"), c.req.valid("json")) }));
api.delete("/transactions/:id", async (c) => c.json({ data: await deleteTransaction(c.env, c.req.param("id")) }));

api.get("/budgets", async (c) => {
  const now = new Date();
  const month = c.req.query("month") ? Number(c.req.query("month")) : now.getMonth() + 1;
  const year = c.req.query("year") ? Number(c.req.query("year")) : now.getFullYear();
  return c.json({ data: await listBudgets(c.env, year, month) });
});
api.post("/budgets", requireAdmin, zValidator("json", budgetCreateSchema), async (c) => c.json({ data: await createBudget(c.env, c.req.valid("json")) }, 201));
api.patch("/budgets/:id", requireAdmin, zValidator("json", budgetUpdateSchema), async (c) => c.json({ data: await updateBudget(c.env, routeId(c.req.param("id")), c.req.valid("json")) }));
api.delete("/budgets/:id", requireAdmin, async (c) => c.json({ data: await deleteBudget(c.env, routeId(c.req.param("id"))) }));

api.get("/reports/overview", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  return c.json({ data: await getOverviewReport(c.env, from, to) });
});

api.get("/reports/transactions", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  return c.json({ data: await getReportTransactions(c.env, from, to) });
});

api.get("/reports/income-expense", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  const compareFrom = dateSchema.optional().parse(c.req.query("compareFrom"));
  const compareTo = dateSchema.optional().parse(c.req.query("compareTo"));
  return c.json({ data: await getIncomeExpenseReport(c.env, from, to, compareFrom, compareTo) });
});

api.get("/reports/categories", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  const categoryId = c.req.query("categoryId");
  return c.json({ data: await getCategoryReport(c.env, from, to, categoryId) });
});

api.get("/reports/members", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  return c.json({ data: await getMemberReport(c.env, from, to) });
});

api.get("/reports/debts", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  return c.json({ data: await getDebtReport(c.env, from, to) });
});

api.get("/reports/export", async (c) => {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const from = dateSchema.optional().parse(c.req.query("from")) ?? defaultFrom;
  const to = dateSchema.optional().parse(c.req.query("to")) ?? defaultTo;
  const format = c.req.query("format") ?? "csv";
  const type = c.req.query("type") ?? "transactions";

  const data = await getExportData(c.env, from, to, type);
  const file = format === "csv" ? generateCSV(data) : generateExcel(data);

  return new Response(file, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ledgard-${type}-${from}-${to}.${format}"`
    }
  });
});

api.get("/scheduled-transactions", async (c) => c.json({ data: await listScheduledTransactions(c.env) }));
api.post("/scheduled-transactions", requireAdmin, zValidator("json", scheduledCreateSchema), async (c) => {
  const input = c.req.valid("json");
  return c.json({ data: await createScheduledTransaction(c.env, { ...input, description: input.description ?? null, destination_account_id: input.destination_account_id ?? null, category_id: input.category_id ?? null }) }, 201);
});
api.patch("/scheduled-transactions/:id", requireAdmin, zValidator("json", scheduledUpdateSchema), async (c) => c.json({ data: await updateScheduledTransaction(c.env, routeId(c.req.param("id")), c.req.valid("json")) }));
api.delete("/scheduled-transactions/:id", requireAdmin, async (c) => c.json({ data: await deleteScheduledTransaction(c.env, routeId(c.req.param("id"))) }));

api.get("/recurring-budgets", async (c) => c.json({ data: await listRecurringBudgets(c.env) }));
api.post("/recurring-budgets", requireAdmin, zValidator("json", recurringBudgetCreateSchema), async (c) => c.json({ data: await createRecurringBudget(c.env, c.req.valid("json")) }, 201));
api.patch("/recurring-budgets/:id", requireAdmin, zValidator("json", recurringBudgetUpdateSchema), async (c) => c.json({ data: await updateRecurringBudget(c.env, routeId(c.req.param("id")), c.req.valid("json")) }));
api.delete("/recurring-budgets/:id", requireAdmin, async (c) => c.json({ data: await deleteRecurringBudget(c.env, routeId(c.req.param("id"))) }));

api.get("/budget-templates", async (c) => {
  const member = c.get("member");
  return c.json({ data: await listBudgetTemplates(c.env, member.id) });
});
api.get("/budget-templates/:id/items", async (c) => c.json({ data: await getBudgetTemplateItems(c.env, routeId(c.req.param("id"))) }));
api.post("/budget-templates", requireAdmin, zValidator("json", budgetTemplateCreateSchema), async (c) => c.json({ data: await createBudgetTemplate(c.env, c.req.valid("json")) }, 201));
api.patch("/budget-templates/:id", requireAdmin, zValidator("json", budgetTemplateUpdateSchema), async (c) => c.json({ data: await updateBudgetTemplate(c.env, routeId(c.req.param("id")), c.req.valid("json")) }));
api.delete("/budget-templates/:id", requireAdmin, async (c) => c.json({ data: await deleteBudgetTemplate(c.env, routeId(c.req.param("id"))) }));
api.post("/budget-templates/:id/apply", requireAdmin, zValidator("json", budgetTemplateApplySchema), async (c) => {
  const { target_year, target_month } = c.req.valid("json");
  return c.json({ data: await applyBudgetTemplate(c.env, routeId(c.req.param("id")), target_year, target_month) });
});
