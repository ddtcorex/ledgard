import { z } from "zod";

export const currencySchema = z.enum(["USD", "VND", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD"]);
export const localeSchema = z.enum(["en", "vi"]);
export const accountTypeSchema = z.enum(["cash", "bank", "credit_card", "savings"]);
export const memberRoleSchema = z.enum(["admin", "member"]);
export const categoryTypeSchema = z.enum(["income", "expense"]);
export const transactionTypeSchema = z.enum(["income", "expense", "transfer", "loan", "debt", "debt_collection", "repayment"]);
export const scheduledTypeSchema = z.enum(["income", "expense", "transfer"]);
export const frequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
export const recurringBudgetFrequencySchema = z.enum(["monthly", "quarterly", "yearly"]);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const settingsPatchSchema = z.object({
  global_lock_until_date: dateSchema.optional(),
  default_locale: localeSchema.optional(),
  default_currency: currencySchema.optional()
});

export const memberCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: memberRoleSchema.default("member"),
  avatar_url: z.string().url().nullable().optional()
});

export const memberUpdateSchema = memberCreateSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional()
});

export const accountCreateSchema = z.object({
  name: z.string().min(1),
  type: accountTypeSchema,
  initial_balance: z.number().int(),
  currency: currencySchema
});

export const accountUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: accountTypeSchema.optional(),
  initial_balance: z.number().int().optional(),
  currency: currencySchema.optional(),
  is_active: z.number().int().min(0).max(1).optional()
});

export const categoryCreateSchema = z.object({
  parent_id: z.string().nullable().optional(),
  name: z.string().min(1),
  type: categoryTypeSchema,
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional()
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional()
});

export const transactionInputSchema = z.object({
  amount: z.number().int().positive(),
  currency: currencySchema,
  type: transactionTypeSchema,
  account_id: z.string().min(1),
  destination_account_id: z.string().nullable().optional(),
  member_id: z.string().min(1),
  category_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  transaction_date: dateSchema
});

export const budgetCreateSchema = z.object({
  category_id: z.string().min(1),
  member_id: z.string().nullable().optional(),
  amount: z.number().int().positive(),
  currency: currencySchema,
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(1970).max(2200)
});

export const budgetUpdateSchema = budgetCreateSchema.partial();

export const scheduledCreateSchema = z.object({
  account_id: z.string().min(1),
  destination_account_id: z.string().nullable().optional(),
  member_id: z.string().min(1),
  category_id: z.string().nullable().optional(),
  amount: z.number().int().positive(),
  currency: currencySchema,
  type: scheduledTypeSchema,
  frequency: frequencySchema,
  interval_day: z.number().int().min(1).max(31),
  description: z.string().nullable().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
  next_run_date: dateSchema
});

export const scheduledUpdateSchema = scheduledCreateSchema.partial();

export const recurringBudgetCreateSchema = z.object({
  category_id: z.string().min(1),
  member_id: z.string().nullable().optional(),
  amount: z.number().int().positive(),
  currency: currencySchema,
  frequency: recurringBudgetFrequencySchema,
  start_month: z.number().int().min(1).max(12),
  start_year: z.number().int().min(1970).max(2200),
  end_month: z.number().int().min(1).max(12).nullable().optional(),
  end_year: z.number().int().min(1970).max(2200).nullable().optional()
});

export const recurringBudgetUpdateSchema = z.object({
  amount: z.number().int().positive().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
  end_month: z.number().int().min(1).max(12).nullable().optional(),
  end_year: z.number().int().min(1970).max(2200).nullable().optional()
});

export const budgetTemplateCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  created_by: z.string().min(1),
  is_shared: z.number().int().min(0).max(1).optional(),
  items: z.array(z.object({
    category_id: z.string().min(1),
    member_id: z.string().nullable().optional(),
    amount: z.number().int().positive(),
    currency: currencySchema
  }))
});

export const budgetTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_shared: z.number().int().min(0).max(1).optional()
});

export const budgetTemplateApplySchema = z.object({
  template_id: z.string().min(1),
  target_year: z.number().int().min(1970).max(2200),
  target_month: z.number().int().min(1).max(12)
});
