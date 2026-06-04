import type { Env } from "../env";
import { all, run } from "../db/d1";
import { getGravatarUrl } from "../../shared/utils/gravatar";
import type { Member } from "../../shared/types/domain";

/**
 * Migrate existing members to have Gravatar URLs
 * This updates all members that have null or empty avatar_url
 */
export async function migrateAvatarsForExistingMembers(env: Env): Promise<{ updated: number }> {
  const members = await all<Member>(
    env.DB,
    "SELECT * FROM members WHERE avatar_url IS NULL OR avatar_url = ''"
  );

  let updated = 0;
  for (const member of members) {
    const gravatarUrl = getGravatarUrl(member.email);
    await run(
      env.DB,
      "UPDATE members SET avatar_url = ? WHERE id = ?",
      gravatarUrl,
      member.id
    );
    updated++;
  }

  return { updated };
}
