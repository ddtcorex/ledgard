import { describe, expect, it } from "vitest";
import {
  currencySchema,
  localeSchema,
  accountTypeSchema,
  memberRoleSchema,
  categoryTypeSchema,
  transactionTypeSchema,
  scheduledTypeSchema,
  frequencySchema,
  dateSchema,
  settingsPatchSchema,
  memberCreateSchema,
  memberUpdateSchema,
  accountCreateSchema,
  accountUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  transactionInputSchema,
  budgetCreateSchema,
  budgetUpdateSchema,
  scheduledCreateSchema,
  scheduledUpdateSchema
} from "../../src/worker/validation/schemas";

describe("validation schemas", () => {
  describe("currencySchema", () => {
    it("accepts valid currencies", () => {
      expect(currencySchema.parse("USD")).toBe("USD");
      expect(currencySchema.parse("VND")).toBe("VND");
      expect(currencySchema.parse("EUR")).toBe("EUR");
      expect(currencySchema.parse("GBP")).toBe("GBP");
      expect(currencySchema.parse("JPY")).toBe("JPY");
      expect(currencySchema.parse("SGD")).toBe("SGD");
      expect(currencySchema.parse("AUD")).toBe("AUD");
      expect(currencySchema.parse("CAD")).toBe("CAD");
    });

    it("rejects invalid currencies", () => {
      expect(() => currencySchema.parse("XXX")).toThrow();
      expect(() => currencySchema.parse("")).toThrow();
      expect(() => currencySchema.parse(null)).toThrow();
    });
  });

  describe("localeSchema", () => {
    it("accepts valid locales", () => {
      expect(localeSchema.parse("en")).toBe("en");
      expect(localeSchema.parse("vi")).toBe("vi");
    });

    it("rejects invalid locales", () => {
      expect(() => localeSchema.parse("fr")).toThrow();
      expect(() => localeSchema.parse("")).toThrow();
    });
  });

  describe("accountTypeSchema", () => {
    it("accepts valid account types", () => {
      expect(accountTypeSchema.parse("cash")).toBe("cash");
      expect(accountTypeSchema.parse("bank")).toBe("bank");
      expect(accountTypeSchema.parse("credit_card")).toBe("credit_card");
      expect(accountTypeSchema.parse("savings")).toBe("savings");
    });

    it("rejects invalid account types", () => {
      expect(() => accountTypeSchema.parse("investment")).toThrow();
      expect(() => accountTypeSchema.parse("")).toThrow();
    });
  });

  describe("memberRoleSchema", () => {
    it("accepts valid roles", () => {
      expect(memberRoleSchema.parse("admin")).toBe("admin");
      expect(memberRoleSchema.parse("member")).toBe("member");
    });

    it("rejects invalid roles", () => {
      expect(() => memberRoleSchema.parse("guest")).toThrow();
      expect(() => memberRoleSchema.parse("")).toThrow();
    });
  });

  describe("categoryTypeSchema", () => {
    it("accepts valid category types", () => {
      expect(categoryTypeSchema.parse("income")).toBe("income");
      expect(categoryTypeSchema.parse("expense")).toBe("expense");
    });

    it("rejects invalid category types", () => {
      expect(() => categoryTypeSchema.parse("transfer")).toThrow();
      expect(() => categoryTypeSchema.parse("")).toThrow();
    });
  });

  describe("transactionTypeSchema", () => {
    it("accepts all valid transaction types", () => {
      expect(transactionTypeSchema.parse("income")).toBe("income");
      expect(transactionTypeSchema.parse("expense")).toBe("expense");
      expect(transactionTypeSchema.parse("transfer")).toBe("transfer");
      expect(transactionTypeSchema.parse("loan")).toBe("loan");
      expect(transactionTypeSchema.parse("debt")).toBe("debt");
      expect(transactionTypeSchema.parse("debt_collection")).toBe("debt_collection");
      expect(transactionTypeSchema.parse("repayment")).toBe("repayment");
    });

    it("rejects invalid transaction types", () => {
      expect(() => transactionTypeSchema.parse("payment")).toThrow();
      expect(() => transactionTypeSchema.parse("")).toThrow();
    });
  });

  describe("scheduledTypeSchema", () => {
    it("accepts valid scheduled types", () => {
      expect(scheduledTypeSchema.parse("income")).toBe("income");
      expect(scheduledTypeSchema.parse("expense")).toBe("expense");
      expect(scheduledTypeSchema.parse("transfer")).toBe("transfer");
    });

    it("rejects loan/debt types for scheduled transactions", () => {
      expect(() => scheduledTypeSchema.parse("loan")).toThrow();
      expect(() => scheduledTypeSchema.parse("debt")).toThrow();
    });
  });

  describe("frequencySchema", () => {
    it("accepts valid frequencies", () => {
      expect(frequencySchema.parse("daily")).toBe("daily");
      expect(frequencySchema.parse("weekly")).toBe("weekly");
      expect(frequencySchema.parse("monthly")).toBe("monthly");
      expect(frequencySchema.parse("yearly")).toBe("yearly");
    });

    it("rejects invalid frequencies", () => {
      expect(() => frequencySchema.parse("hourly")).toThrow();
      expect(() => frequencySchema.parse("")).toThrow();
    });
  });

  describe("dateSchema", () => {
    it("accepts valid YYYY-MM-DD dates", () => {
      expect(dateSchema.parse("2026-05-23")).toBe("2026-05-23");
      expect(dateSchema.parse("2024-02-29")).toBe("2024-02-29");
      expect(dateSchema.parse("1970-01-01")).toBe("1970-01-01");
    });

    it("rejects invalid date formats", () => {
      expect(() => dateSchema.parse("23-05-2026")).toThrow();
      expect(() => dateSchema.parse("2026/05/23")).toThrow();
      expect(() => dateSchema.parse("2026-5-23")).toThrow();
      expect(() => dateSchema.parse("")).toThrow();
      expect(() => dateSchema.parse("not-a-date")).toThrow();
    });
  });

  describe("settingsPatchSchema", () => {
    it("accepts valid partial settings", () => {
      expect(settingsPatchSchema.parse({ global_lock_until_date: "2026-01-01" })).toEqual({
        global_lock_until_date: "2026-01-01"
      });
      expect(settingsPatchSchema.parse({ default_locale: "vi" })).toEqual({ default_locale: "vi" });
      expect(settingsPatchSchema.parse({ default_currency: "VND" })).toEqual({ default_currency: "VND" });
      expect(settingsPatchSchema.parse({})).toEqual({});
    });

    it("rejects invalid settings", () => {
      expect(() => settingsPatchSchema.parse({ global_lock_until_date: "invalid" })).toThrow();
      expect(() => settingsPatchSchema.parse({ default_locale: "fr" })).toThrow();
      expect(() => settingsPatchSchema.parse({ default_currency: "XXX" })).toThrow();
    });
  });

  describe("memberCreateSchema", () => {
    it("accepts valid member data", () => {
      const valid = {
        name: "John Doe",
        email: "john@example.com",
        role: "member" as const,
        avatar_url: "https://example.com/avatar.jpg"
      };
      expect(memberCreateSchema.parse(valid)).toEqual(valid);
    });

    it("defaults role to member", () => {
      const input = { name: "Jane", email: "jane@example.com" };
      const result = memberCreateSchema.parse(input);
      expect(result.role).toBe("member");
    });

    it("accepts null avatar_url", () => {
      const input = { name: "Jane", email: "jane@example.com", avatar_url: null };
      expect(memberCreateSchema.parse(input)).toEqual({ ...input, role: "member" });
    });

    it("rejects invalid email", () => {
      expect(() => memberCreateSchema.parse({ name: "John", email: "not-an-email" })).toThrow();
    });

    it("rejects empty name", () => {
      expect(() => memberCreateSchema.parse({ name: "", email: "john@example.com" })).toThrow();
    });

    it("rejects invalid avatar URL", () => {
      expect(() => memberCreateSchema.parse({ name: "John", email: "john@example.com", avatar_url: "not-a-url" })).toThrow();
    });
  });

  describe("memberUpdateSchema", () => {
    it("accepts partial updates", () => {
      expect(memberUpdateSchema.parse({ name: "New Name" })).toEqual({ name: "New Name" });
      expect(memberUpdateSchema.parse({ is_active: 0 })).toEqual({ is_active: 0 });
      expect(memberUpdateSchema.parse({})).toEqual({});
    });

    it("validates is_active as 0 or 1", () => {
      expect(memberUpdateSchema.parse({ is_active: 0 })).toEqual({ is_active: 0 });
      expect(memberUpdateSchema.parse({ is_active: 1 })).toEqual({ is_active: 1 });
      expect(() => memberUpdateSchema.parse({ is_active: 2 })).toThrow();
      expect(() => memberUpdateSchema.parse({ is_active: -1 })).toThrow();
    });
  });

  describe("accountCreateSchema", () => {
    it("accepts valid account data", () => {
      const valid = {
        name: "Cash Wallet",
        type: "cash" as const,
        initial_balance: 100000,
        currency: "USD" as const
      };
      expect(accountCreateSchema.parse(valid)).toEqual(valid);
    });

    it("accepts zero initial balance", () => {
      const input = { name: "Bank", type: "bank" as const, initial_balance: 0, currency: "VND" as const };
      expect(accountCreateSchema.parse(input)).toEqual(input);
    });

    it("accepts negative initial balance for credit cards", () => {
      const input = { name: "Credit Card", type: "credit_card" as const, initial_balance: -50000, currency: "USD" as const };
      expect(accountCreateSchema.parse(input)).toEqual(input);
    });

    it("rejects empty name", () => {
      expect(() => accountCreateSchema.parse({ name: "", type: "cash", initial_balance: 0, currency: "USD" })).toThrow();
    });

    it("rejects non-integer balance", () => {
      expect(() => accountCreateSchema.parse({ name: "Bank", type: "bank", initial_balance: 100.5, currency: "USD" })).toThrow();
    });
  });

  describe("accountUpdateSchema", () => {
    it("accepts partial updates", () => {
      expect(accountUpdateSchema.parse({ name: "New Name" })).toEqual({ name: "New Name" });
      expect(accountUpdateSchema.parse({ is_active: 0 })).toEqual({ is_active: 0 });
      expect(accountUpdateSchema.parse({})).toEqual({});
    });

    it("validates is_active as 0 or 1", () => {
      expect(accountUpdateSchema.parse({ is_active: 1 })).toEqual({ is_active: 1 });
      expect(() => accountUpdateSchema.parse({ is_active: 3 })).toThrow();
    });
  });

  describe("categoryCreateSchema", () => {
    it("accepts valid category data", () => {
      const valid = {
        parent_id: "cat-parent",
        name: "Groceries",
        type: "expense" as const,
        icon: "shopping-cart",
        color: "#FF5733"
      };
      expect(categoryCreateSchema.parse(valid)).toEqual(valid);
    });

    it("accepts null parent_id for root categories", () => {
      const input = { parent_id: null, name: "Food", type: "expense" as const };
      expect(categoryCreateSchema.parse(input)).toEqual(input);
    });

    it("accepts missing optional fields", () => {
      const input = { name: "Transport", type: "expense" as const };
      expect(categoryCreateSchema.parse(input)).toEqual(input);
    });

    it("rejects empty name", () => {
      expect(() => categoryCreateSchema.parse({ name: "", type: "expense" })).toThrow();
    });
  });

  describe("categoryUpdateSchema", () => {
    it("accepts partial updates", () => {
      expect(categoryUpdateSchema.parse({ name: "Updated Name" })).toEqual({ name: "Updated Name" });
      expect(categoryUpdateSchema.parse({ icon: "new-icon" })).toEqual({ icon: "new-icon" });
      expect(categoryUpdateSchema.parse({ is_active: 0 })).toEqual({ is_active: 0 });
      expect(categoryUpdateSchema.parse({})).toEqual({});
    });
  });

  describe("transactionInputSchema", () => {
    it("accepts valid transaction data", () => {
      const valid = {
        amount: 50000,
        currency: "USD" as const,
        type: "expense" as const,
        account_id: "acc-cash",
        member_id: "mem-john",
        category_id: "cat-food",
        description: "Lunch",
        transaction_date: "2026-05-23"
      };
      expect(transactionInputSchema.parse(valid)).toEqual(valid);
    });

    it("accepts null optional fields", () => {
      const input = {
        amount: 10000,
        currency: "VND" as const,
        type: "transfer" as const,
        account_id: "acc-bank",
        destination_account_id: null,
        member_id: "mem-jane",
        category_id: null,
        description: null,
        transaction_date: "2026-05-23"
      };
      expect(transactionInputSchema.parse(input)).toEqual(input);
    });

    it("rejects zero amount", () => {
      expect(() => transactionInputSchema.parse({
        amount: 0,
        currency: "USD",
        type: "expense",
        account_id: "acc-cash",
        member_id: "mem-john",
        transaction_date: "2026-05-23"
      })).toThrow();
    });

    it("rejects negative amount", () => {
      expect(() => transactionInputSchema.parse({
        amount: -1000,
        currency: "USD",
        type: "expense",
        account_id: "acc-cash",
        member_id: "mem-john",
        transaction_date: "2026-05-23"
      })).toThrow();
    });

    it("rejects non-integer amount", () => {
      expect(() => transactionInputSchema.parse({
        amount: 100.5,
        currency: "USD",
        type: "expense",
        account_id: "acc-cash",
        member_id: "mem-john",
        transaction_date: "2026-05-23"
      })).toThrow();
    });

    it("rejects invalid date format", () => {
      expect(() => transactionInputSchema.parse({
        amount: 1000,
        currency: "USD",
        type: "expense",
        account_id: "acc-cash",
        member_id: "mem-john",
        transaction_date: "23/05/2026"
      })).toThrow();
    });

    it("rejects empty account_id", () => {
      expect(() => transactionInputSchema.parse({
        amount: 1000,
        currency: "USD",
        type: "expense",
        account_id: "",
        member_id: "mem-john",
        transaction_date: "2026-05-23"
      })).toThrow();
    });
  });

  describe("budgetCreateSchema", () => {
    it("accepts valid budget data", () => {
      const valid = {
        category_id: "cat-food",
        member_id: "mem-john",
        amount: 500000,
        currency: "VND" as const,
        period_month: 5,
        period_year: 2026
      };
      expect(budgetCreateSchema.parse(valid)).toEqual(valid);
    });

    it("accepts null member_id for shared budgets", () => {
      const input = {
        category_id: "cat-food",
        member_id: null,
        amount: 500000,
        currency: "VND" as const,
        period_month: 5,
        period_year: 2026
      };
      expect(budgetCreateSchema.parse(input)).toEqual(input);
    });

    it("rejects zero amount", () => {
      expect(() => budgetCreateSchema.parse({
        category_id: "cat-food",
        amount: 0,
        currency: "USD",
        period_month: 5,
        period_year: 2026
      })).toThrow();
    });

    it("rejects invalid month", () => {
      expect(() => budgetCreateSchema.parse({
        category_id: "cat-food",
        amount: 100000,
        currency: "USD",
        period_month: 0,
        period_year: 2026
      })).toThrow();
      expect(() => budgetCreateSchema.parse({
        category_id: "cat-food",
        amount: 100000,
        currency: "USD",
        period_month: 13,
        period_year: 2026
      })).toThrow();
    });

    it("rejects invalid year", () => {
      expect(() => budgetCreateSchema.parse({
        category_id: "cat-food",
        amount: 100000,
        currency: "USD",
        period_month: 5,
        period_year: 1969
      })).toThrow();
      expect(() => budgetCreateSchema.parse({
        category_id: "cat-food",
        amount: 100000,
        currency: "USD",
        period_month: 5,
        period_year: 2201
      })).toThrow();
    });
  });

  describe("budgetUpdateSchema", () => {
    it("accepts partial updates", () => {
      expect(budgetUpdateSchema.parse({ amount: 600000 })).toEqual({ amount: 600000 });
      expect(budgetUpdateSchema.parse({ period_month: 6 })).toEqual({ period_month: 6 });
      expect(budgetUpdateSchema.parse({})).toEqual({});
    });
  });

  describe("scheduledCreateSchema", () => {
    it("accepts valid scheduled transaction data", () => {
      const valid = {
        account_id: "acc-bank",
        member_id: "mem-john",
        category_id: "cat-bills",
        amount: 100000,
        currency: "USD" as const,
        type: "expense" as const,
        frequency: "monthly" as const,
        interval_day: 15,
        description: "Monthly rent",
        is_active: 1,
        next_run_date: "2026-06-15"
      };
      expect(scheduledCreateSchema.parse(valid)).toEqual(valid);
    });

    it("accepts null optional fields", () => {
      const input = {
        account_id: "acc-bank",
        destination_account_id: null,
        member_id: "mem-john",
        category_id: null,
        amount: 50000,
        currency: "VND" as const,
        type: "transfer" as const,
        frequency: "weekly" as const,
        interval_day: 1,
        description: null,
        next_run_date: "2026-05-30"
      };
      expect(scheduledCreateSchema.parse(input)).toEqual(input);
    });

    it("rejects invalid interval_day", () => {
      expect(() => scheduledCreateSchema.parse({
        account_id: "acc-bank",
        member_id: "mem-john",
        amount: 100000,
        currency: "USD",
        type: "expense",
        frequency: "monthly",
        interval_day: 0,
        next_run_date: "2026-06-15"
      })).toThrow();
      expect(() => scheduledCreateSchema.parse({
        account_id: "acc-bank",
        member_id: "mem-john",
        amount: 100000,
        currency: "USD",
        type: "expense",
        frequency: "monthly",
        interval_day: 32,
        next_run_date: "2026-06-15"
      })).toThrow();
    });

    it("validates is_active as 0 or 1", () => {
      const base = {
        account_id: "acc-bank",
        member_id: "mem-john",
        amount: 100000,
        currency: "USD" as const,
        type: "expense" as const,
        frequency: "monthly" as const,
        interval_day: 15,
        next_run_date: "2026-06-15"
      };
      expect(scheduledCreateSchema.parse({ ...base, is_active: 0 })).toEqual({ ...base, is_active: 0 });
      expect(scheduledCreateSchema.parse({ ...base, is_active: 1 })).toEqual({ ...base, is_active: 1 });
      expect(() => scheduledCreateSchema.parse({ ...base, is_active: 2 })).toThrow();
    });
  });

  describe("scheduledUpdateSchema", () => {
    it("accepts partial updates", () => {
      expect(scheduledUpdateSchema.parse({ amount: 120000 })).toEqual({ amount: 120000 });
      expect(scheduledUpdateSchema.parse({ is_active: 0 })).toEqual({ is_active: 0 });
      expect(scheduledUpdateSchema.parse({ frequency: "yearly" })).toEqual({ frequency: "yearly" });
      expect(scheduledUpdateSchema.parse({})).toEqual({});
    });
  });
});
