import type { Member } from "../shared/types/domain";

export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  DEV_USER_EMAIL?: string;
  DEFAULT_LOCALE?: string;
  DEFAULT_CURRENCY?: string;
}

export interface Variables {
  member: Member;
  requestId: string;
}
