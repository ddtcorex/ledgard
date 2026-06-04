-- Migration: Add budget templates support
-- This enables saving and reusing budget configurations

PRAGMA foreign_keys = ON;

-- Budget templates
CREATE TABLE IF NOT EXISTS budget_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_by TEXT NOT NULL,
  is_shared INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
);

-- Budget template items (the actual budget entries in the template)
CREATE TABLE IF NOT EXISTS budget_template_items (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  member_id TEXT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT DEFAULT 'USD',
  FOREIGN KEY (template_id) REFERENCES budget_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_budget_templates_created_by ON budget_templates(created_by, is_shared);
CREATE INDEX idx_budget_template_items_template ON budget_template_items(template_id);
