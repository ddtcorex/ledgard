import type { ErrorHandler } from "hono";
import type { Env, Variables } from "../env";

export const errorHandler: ErrorHandler<{ Bindings: Env; Variables: Variables }> = (error, c) => {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const [maybeCode, ...rest] = message.split(":");
  const code = rest.length > 0 ? maybeCode : "INTERNAL_ERROR";
  const cleanMessage = rest.length > 0 ? rest.join(":").trim() : "Unexpected server error.";
  const status = statusForCode(code);

  return c.json(
    {
      error: {
        code,
        message: cleanMessage,
        request_id: c.get("requestId")
      }
    },
    status
  );
};

function statusForCode(code: string): 400 | 401 | 403 | 404 | 409 | 500 {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "MUTATION_BLOCKED") return 409;
  if (code === "VALIDATION_ERROR") return 400;
  return 500;
}
