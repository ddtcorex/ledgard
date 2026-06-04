import type { Context, MiddlewareHandler, Next } from "hono";
import type { Env, Variables } from "../env";
import { ensureDevMember } from "../services/members";
import { ensureDefaultSettings } from "../services/settings";

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

export const requestContext: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
};

export const authenticate: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  if (c.req.path === "/api/health") {
    await next();
    return;
  }

  await ensureDefaultSettings(c.env);
  const email = getAccessEmail(c) ?? getDevEmail(c.env);
  if (!email) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Missing Cloudflare Access identity." } }, 401);
  }

  const member = await ensureDevMember(c.env, email);
  if (!member || member.is_active !== 1) {
    return c.json({ error: { code: "FORBIDDEN", message: "The authenticated email is not an active Ledgard member." } }, 403);
  }

  c.set("member", member);
  await next();
};

export async function requireAdmin(c: AppContext, next: Next): Promise<Response | void> {
  const member = c.get("member");
  if (member.role !== "admin") {
    return c.json({ error: { code: "FORBIDDEN", message: "Administrator access is required." } }, 403);
  }
  await next();
}

function getAccessEmail(c: AppContext): string | null {
  return c.req.header("CF-Access-Authenticated-User-Email") ?? c.req.header("Cf-Access-Authenticated-User-Email") ?? null;
}

function getDevEmail(env: Env): string | undefined {
  return env.ENVIRONMENT === "production" ? undefined : env.DEV_USER_EMAIL;
}
