import type { Env } from "../env";

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function first<T>(db: D1Database, sql: string, ...bindings: unknown[]): Promise<T | null> {
  const row = await db.prepare(sql).bind(...bindings).first<T>();
  return row ?? null;
}

export async function all<T>(db: D1Database, sql: string, ...bindings: unknown[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results ?? [];
}

export async function run(db: D1Database, sql: string, ...bindings: unknown[]): Promise<D1Result> {
  return db.prepare(sql).bind(...bindings).run();
}

export function defaultCurrency(env: Env): string {
  return env.DEFAULT_CURRENCY || "USD";
}

export function defaultLocale(env: Env): string {
  return env.DEFAULT_LOCALE || "en";
}
