import type { Member, MemberRole } from "../../shared/types/domain";
import { all, createId, first, run } from "../db/d1";
import type { Env } from "../env";
import { getGravatarUrl } from "../../shared/utils/gravatar";

export async function getMemberByEmail(env: Env, email: string): Promise<Member | null> {
  return first<Member>(env.DB, "SELECT * FROM members WHERE lower(email) = lower(?) LIMIT 1", email);
}

export async function ensureDevMember(env: Env, email: string): Promise<Member | null> {
  const existing = await getMemberByEmail(env, email);
  if (existing) {
    return existing;
  }

  if (!env.DEV_USER_EMAIL || env.DEV_USER_EMAIL.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  const id = createId("mem");
  const name = email.split("@")[0] || "Admin";
  const avatarUrl = getGravatarUrl(email);
  await run(env.DB, "INSERT INTO members (id, name, email, role, avatar_url) VALUES (?, ?, ?, 'admin', ?)", id, name, email, avatarUrl);
  return getMemberByEmail(env, email);
}

export async function listMembers(env: Env): Promise<Member[]> {
  return all<Member>(env.DB, "SELECT * FROM members ORDER BY role ASC, name ASC");
}

export async function createMember(env: Env, input: { name: string; email: string; role: MemberRole; avatar_url?: string | null }): Promise<Member> {
  const id = createId("mem");
  const avatarUrl = input.avatar_url ?? getGravatarUrl(input.email);
  await run(
    env.DB,
    "INSERT INTO members (id, name, email, role, avatar_url) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name,
    input.email,
    input.role,
    avatarUrl
  );
  const member = await first<Member>(env.DB, "SELECT * FROM members WHERE id = ?", id);
  if (!member) {
    throw new Error("NOT_FOUND: Member was not created.");
  }
  return member;
}

export async function updateMember(
  env: Env,
  id: string,
  patch: Partial<{ name: string; email: string; role: MemberRole; avatar_url: string | null; is_active: number }>
): Promise<Member> {
  const current = await first<Member>(env.DB, "SELECT * FROM members WHERE id = ?", id);
  if (!current) {
    throw new Error("NOT_FOUND: Member not found.");
  }

  const newEmail = patch.email ?? current.email;
  let avatarUrl = patch.avatar_url === undefined ? current.avatar_url : patch.avatar_url;

  // If email changed and avatar_url wasn't explicitly set, regenerate Gravatar
  if (patch.email && patch.email !== current.email && patch.avatar_url === undefined) {
    avatarUrl = getGravatarUrl(newEmail);
  }

  await run(
    env.DB,
    "UPDATE members SET name = ?, email = ?, role = ?, avatar_url = ?, is_active = ? WHERE id = ?",
    patch.name ?? current.name,
    newEmail,
    patch.role ?? current.role,
    avatarUrl,
    patch.is_active ?? current.is_active,
    id
  );

  const updated = await first<Member>(env.DB, "SELECT * FROM members WHERE id = ?", id);
  if (!updated) {
    throw new Error("NOT_FOUND: Member not found.");
  }
  return updated;
}

export async function deleteMember(env: Env, id: string): Promise<boolean> {
  const linked = await first<{ count: number }>(
    env.DB,
    "SELECT COUNT(*) as count FROM transactions WHERE member_id = ?",
    id
  );
  if (linked && linked.count > 0) {
    throw new Error("VALIDATION_ERROR: Cannot delete member because they have linked transactions.");
  }

  await run(env.DB, "DELETE FROM members WHERE id = ?", id);
  return true;
}
