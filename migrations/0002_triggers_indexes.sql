PRAGMA foreign_keys = ON;

CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at
AFTER UPDATE ON system_settings
FOR EACH ROW
BEGIN
  UPDATE system_settings
  SET updated_at = datetime('now', 'utc')
  WHERE key = OLD.key;
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_updated_at
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
  UPDATE transactions
  SET updated_at = datetime('now', 'utc')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_lock_enforcement_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'MUTATION_BLOCKED: Financial records for this period are locked by system administrator.')
  WHERE NEW.transaction_date <= (SELECT value FROM system_settings WHERE key = 'global_lock_until_date');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_lock_enforcement_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'MUTATION_BLOCKED: Financial records for this period are locked by system administrator.')
  WHERE OLD.transaction_date <= (SELECT value FROM system_settings WHERE key = 'global_lock_until_date');
END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_lock_enforcement_delete
BEFORE DELETE ON transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'MUTATION_BLOCKED: Financial records for this period are locked by system administrator.')
  WHERE OLD.transaction_date <= (SELECT value FROM system_settings WHERE key = 'global_lock_until_date');
END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_unique_scope
ON budgets(category_id, COALESCE(member_id, '__shared__'), period_month, period_year);

CREATE INDEX IF NOT EXISTS idx_tx_chronology ON transactions(transaction_date, type);
CREATE INDEX IF NOT EXISTS idx_tx_audit ON transactions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_actor ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_tx_wallet ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_destination_wallet ON transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_search ON budgets(period_year, period_month, member_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_cron ON scheduled_transactions(is_active, next_run_date);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
