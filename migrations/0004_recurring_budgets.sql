-- Migration: Add recurring budgets support
-- This enables automatic budget creation on a schedule (monthly/quarterly/yearly)

PRAGMA foreign_keys = ON;

-- Recurring budget templates
CREATE TABLE IF NOT EXISTS recurring_budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  member_id TEXT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT DEFAULT 'USD',
  frequency TEXT CHECK(frequency IN ('monthly', 'quarterly', 'yearly')) NOT NULL,
  start_month INTEGER NOT NULL CHECK(start_month BETWEEN 1 AND 12),
  start_year INTEGER NOT NULL,
  end_month INTEGER NULL CHECK(end_month IS NULL OR end_month BETWEEN 1 AND 12),
  end_year INTEGER NULL,
  is_active INTEGER DEFAULT 1,
  next_run_month INTEGER NOT NULL CHECK(next_run_month BETWEEN 1 AND 12),
  next_run_year INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Idempotency tracking (prevent duplicate budget creation)
CREATE TABLE IF NOT EXISTS recurring_budget_runs (
  id TEXT PRIMARY KEY,
  recurring_budget_id TEXT NOT NULL,
  run_year INTEGER NOT NULL,
  run_month INTEGER NOT NULL,
  budget_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  UNIQUE(recurring_budget_id, run_year, run_month),
  FOREIGN KEY (recurring_budget_id) REFERENCES recurring_budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Track budget source (manual, recurring, template)
ALTER TABLE budgets ADD COLUMN source TEXT CHECK(source IN ('manual', 'recurring', 'template')) DEFAULT 'manual';
ALTER TABLE budgets ADD COLUMN recurring_budget_id TEXT NULL REFERENCES recurring_budgets(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_recurring_budgets_active ON recurring_budgets(is_active, next_run_year, next_run_month);
CREATE INDEX idx_recurring_budget_runs_lookup ON recurring_budget_runs(recurring_budget_id, run_year, run_month);
CREATE INDEX idx_budgets_source ON budgets(source, recurring_budget_id);
