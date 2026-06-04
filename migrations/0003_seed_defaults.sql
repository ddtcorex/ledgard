PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO system_settings (key, value) VALUES
  ('global_lock_until_date', '1970-01-01'),
  ('default_locale', 'en'),
  ('default_currency', 'USD');

INSERT OR IGNORE INTO members (id, name, email, role, avatar_url) VALUES
  ('mem-admin', 'Admin', 'admin@ledgard.local', 'admin', NULL),
  ('mem-sam', 'Sam', 'sam@ledgard.local', 'member', NULL);

INSERT OR IGNORE INTO accounts (id, name, type, initial_balance, current_balance, currency) VALUES
  ('acc-cash', 'Cash Wallet', 'cash', 350000, 350000, 'USD'),
  ('acc-bank', 'Joint Checking', 'bank', 5200000, 5200000, 'USD'),
  ('acc-card', 'Family Credit Card', 'credit_card', -75000, -75000, 'USD'),
  ('acc-savings', 'Emergency Savings', 'savings', 1500000, 1500000, 'USD');

INSERT OR IGNORE INTO categories (id, parent_id, name, type, icon, color) VALUES
  ('cat-income', NULL, 'Income', 'income', 'account_balance_wallet', '#10B981'),
  ('cat-salary', 'cat-income', 'Salary', 'income', 'payments', '#10B981'),
  ('cat-bonus', 'cat-income', 'Bonus', 'income', 'redeem', '#10B981'),
  ('cat-expense-home', NULL, 'Housing & Utilities', 'expense', 'home', '#003441'),
  ('cat-rent', 'cat-expense-home', 'Rent', 'expense', 'apartment', '#003441'),
  ('cat-electricity', 'cat-expense-home', 'Electricity', 'expense', 'bolt', '#003441'),
  ('cat-internet', 'cat-expense-home', 'Internet', 'expense', 'wifi', '#003441'),
  ('cat-expense-food', NULL, 'Food & Household', 'expense', 'shopping_cart', '#006a61'),
  ('cat-groceries', 'cat-expense-food', 'Groceries', 'expense', 'grocery', '#006a61'),
  ('cat-dining', 'cat-expense-food', 'Dining Out', 'expense', 'restaurant', '#E11D48'),
  ('cat-expense-transport', NULL, 'Transport', 'expense', 'directions_car', '#F59E0B'),
  ('cat-fuel', 'cat-expense-transport', 'Fuel', 'expense', 'local_gas_station', '#F59E0B'),
  ('cat-rideshare', 'cat-expense-transport', 'Rideshare', 'expense', 'hail', '#F59E0B'),
  ('cat-expense-life', NULL, 'Lifestyle', 'expense', 'auto_awesome', '#482700'),
  ('cat-entertainment', 'cat-expense-life', 'Entertainment', 'expense', 'movie', '#482700'),
  ('cat-health', 'cat-expense-life', 'Health', 'expense', 'medical_services', '#482700');

INSERT OR IGNORE INTO budgets (id, category_id, member_id, amount, currency, period_month, period_year) VALUES
  ('bud-home-shared', 'cat-expense-home', NULL, 300000, 'USD', 1, 2026),
  ('bud-food-shared', 'cat-expense-food', NULL, 120000, 'USD', 1, 2026),
  ('bud-transport-sam', 'cat-expense-transport', 'mem-sam', 30000, 'USD', 1, 2026),
  ('bud-home-shared-2026-05', 'cat-expense-home', NULL, 300000, 'USD', 5, 2026),
  ('bud-food-shared-2026-05', 'cat-expense-food', NULL, 120000, 'USD', 5, 2026),
  ('bud-transport-sam-2026-05', 'cat-expense-transport', 'mem-sam', 30000, 'USD', 5, 2026),
  ('bud-life-admin-2026-05', 'cat-expense-life', 'mem-admin', 50000, 'USD', 5, 2026);

INSERT OR IGNORE INTO transactions
  (id, amount, currency, type, account_id, destination_account_id, member_id, category_id, description, transaction_date)
VALUES
  ('tx-seed-salary', 800000, 'USD', 'income', 'acc-bank', NULL, 'mem-admin', 'cat-salary', 'Monthly salary', '2026-05-01'),
  ('tx-seed-groceries', 18450, 'USD', 'expense', 'acc-bank', NULL, 'mem-sam', 'cat-groceries', 'Weekly groceries', '2026-05-17'),
  ('tx-seed-dining', 8600, 'USD', 'expense', 'acc-card', NULL, 'mem-admin', 'cat-dining', 'Family dinner', '2026-05-18'),
  ('tx-seed-fuel', 5200, 'USD', 'expense', 'acc-cash', NULL, 'mem-sam', 'cat-fuel', 'Fuel refill', '2026-05-18'),
  ('tx-seed-transfer', 25000, 'USD', 'transfer', 'acc-bank', 'acc-cash', 'mem-admin', NULL, 'ATM withdrawal', '2026-05-15'),
  ('tx-seed-loan', 100000, 'USD', 'loan', 'acc-bank', NULL, 'mem-admin', NULL, 'Short-term loan to cousin', '2026-05-10');
