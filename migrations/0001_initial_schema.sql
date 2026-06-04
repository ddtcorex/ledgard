PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('cash', 'bank', 'credit_card', 'savings')) NOT NULL,
  initial_balance INTEGER DEFAULT 0,
  current_balance INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  icon TEXT,
  color TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT DEFAULT 'USD',
  type TEXT CHECK(type IN ('income', 'expense', 'transfer', 'loan', 'debt', 'debt_collection', 'repayment')) NOT NULL,
  account_id TEXT NOT NULL,
  destination_account_id TEXT NULL,
  member_id TEXT NOT NULL,
  category_id TEXT NULL,
  description TEXT,
  transaction_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  updated_at TEXT DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  member_id TEXT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT DEFAULT 'USD',
  period_month INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  destination_account_id TEXT NULL,
  member_id TEXT NOT NULL,
  category_id TEXT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT DEFAULT 'USD',
  type TEXT CHECK(type IN ('income', 'expense', 'transfer')) NOT NULL,
  frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
  interval_day INTEGER NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  next_run_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheduled_transaction_runs (
  id TEXT PRIMARY KEY,
  scheduled_transaction_id TEXT NOT NULL,
  run_date TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  UNIQUE(scheduled_transaction_id, run_date),
  FOREIGN KEY (scheduled_transaction_id) REFERENCES scheduled_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
