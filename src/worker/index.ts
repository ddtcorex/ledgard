import { api } from "./app";
import type { Env } from "./env";
import { runRecurringBudgets } from "./services/recurring-budgets";
import { runScheduledTransactions } from "./services/scheduled";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api")) {
      return api.fetch(request, env, ctx);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Ledgard worker is running. Build frontend assets or call /api/health.", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await runScheduledTransactions(env);
    await runRecurringBudgets(env, year, month);
  }
};
