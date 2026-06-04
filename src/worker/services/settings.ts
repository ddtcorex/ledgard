import type { CurrencyCode, LocaleCode, SystemSettings } from "../../shared/types/domain";
import { supportedCurrencies } from "../../shared/constants/currencies";
import { defaultCurrency, defaultLocale, run } from "../db/d1";
import type { Env } from "../env";

const supportedCurrencyCodes = new Set(supportedCurrencies.map((currency) => currency.code));

export async function ensureDefaultSettings(env: Env): Promise<void> {
  await run(env.DB, "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('global_lock_until_date', '1970-01-01')");
  await run(env.DB, "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_locale', ?)", defaultLocale(env));
  await run(env.DB, "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_currency', ?)", defaultCurrency(env));
}

export async function getSettings(env: Env): Promise<SystemSettings> {
  await ensureDefaultSettings(env);
  const result = await env.DB.prepare("SELECT key, value FROM system_settings").all<{ key: keyof SystemSettings; value: string }>();
  const rows = result.results ?? [];
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    global_lock_until_date: map.get("global_lock_until_date") ?? "1970-01-01",
    default_locale: ((map.get("default_locale") ?? defaultLocale(env)) === "vi" ? "vi" : "en") as LocaleCode,
    default_currency: (supportedCurrencyCodes.has(map.get("default_currency") as CurrencyCode)
      ? map.get("default_currency")
      : defaultCurrency(env)) as CurrencyCode
  };
}

export async function updateSettings(env: Env, patch: Partial<SystemSettings>): Promise<SystemSettings> {
  if (patch.default_locale && !["en", "vi"].includes(patch.default_locale)) {
    throw new Error("VALIDATION_ERROR: Unsupported locale.");
  }
  if (patch.default_currency && !supportedCurrencyCodes.has(patch.default_currency)) {
    throw new Error("VALIDATION_ERROR: Unsupported currency.");
  }

  const statements: D1PreparedStatement[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "string") {
      statements.push(
        env.DB.prepare(
          "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'utc')"
        ).bind(key, value)
      );
    }
  }
  if (statements.length) {
    await env.DB.batch(statements);
  }

  return getSettings(env);
}
