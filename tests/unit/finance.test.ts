import { describe, expect, it } from "vitest";
import { calculateAvailableCash, calculateNetWorth, getBalanceEffects, monthRange, reverseEffects } from "../../src/shared/finance/calculations";
import { fromMajorUnits, toMajorUnits } from "../../src/shared/finance/money";
import type { Account, Transaction } from "../../src/shared/types/domain";

const accounts: Account[] = [
  {
    id: "cash",
    name: "Cash",
    type: "cash",
    initial_balance: 0,
    current_balance: 10000,
    currency: "USD",
    is_active: 1,
    created_at: ""
  },
  {
    id: "bank",
    name: "Bank",
    type: "bank",
    initial_balance: 0,
    current_balance: 50000,
    currency: "USD",
    is_active: 1,
    created_at: ""
  },
  {
    id: "card",
    name: "Credit Card",
    type: "credit_card",
    initial_balance: 0,
    current_balance: -8000,
    currency: "USD",
    is_active: 1,
    created_at: ""
  },
  {
    id: "savings",
    name: "Savings",
    type: "savings",
    initial_balance: 0,
    current_balance: 20000,
    currency: "USD",
    is_active: 1,
    created_at: ""
  }
];

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: "tx",
    amount: 1000,
    currency: "USD",
    type: "expense",
    account_id: "bank",
    destination_account_id: null,
    member_id: "member",
    category_id: null,
    description: null,
    transaction_date: "2026-05-19",
    created_at: "",
    updated_at: "",
    ...partial
  };
}

describe("finance calculations", () => {
  it("calculates liquidity from cash, bank, and savings", () => {
    expect(calculateAvailableCash(accounts)).toBe(80000);
  });

  it("calculates net worth with credit card liabilities and debt/loan positions", () => {
    expect(calculateNetWorth(accounts, 5000, 3000)).toBe(74000);
  });

  it("returns transfer balance effects without changing net worth", () => {
    expect(getBalanceEffects(tx({ type: "transfer", account_id: "bank", destination_account_id: "cash", amount: 2500 }))).toEqual([
      { accountId: "bank", delta: -2500 },
      { accountId: "cash", delta: 2500 }
    ]);
  });

  it("reverses effects for update/delete flows", () => {
    expect(reverseEffects([{ accountId: "bank", delta: -1500 }])).toEqual([{ accountId: "bank", delta: 1500 }]);
  });

  it("converts major/minor units for decimal and zero-decimal currencies", () => {
    expect(fromMajorUnits(12.34, "USD")).toBe(1234);
    expect(toMajorUnits(1234, "USD")).toBe(12.34);
    expect(fromMajorUnits(1234, "VND")).toBe(1234);
    expect(toMajorUnits(1234, "VND")).toBe(1234);
  });

  it("creates month date ranges", () => {
    expect(monthRange(2026, 2)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange(2024, 2)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });
});
