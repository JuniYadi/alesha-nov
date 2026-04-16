import { createDatabaseClient } from "@alesha-nov/db";
import type { AuthUser, UserRow } from "./types";

export async function getUserRolesInternal(
  client: ReturnType<typeof createDatabaseClient>,
  userId: string
): Promise<string[]> {
  const roleRows = await client.sql`
    SELECT role
    FROM auth_user_roles
    WHERE user_id = ${userId}
    ORDER BY role ASC
  `;

  return roleRows.map((row: { role: string }) => row.role);
}

export async function buildAuthUser(
  client: ReturnType<typeof createDatabaseClient>,
  user: UserRow
): Promise<AuthUser> {
  const roles = await getUserRolesInternal(client, user.id);

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password_hash,
    name: user.name,
    image: user.image,
    emailVerifiedAt: user.email_verified_at,
    roles,
    createdAt: String(user.created_at),
  };
}

export async function getUserById(
  client: ReturnType<typeof createDatabaseClient>,
  userId: string
): Promise<AuthUser | null> {
  const rows = await client.sql`
    SELECT id, email, password_hash, name, image, email_verified_at, created_at
    FROM auth_users
    WHERE id = ${userId}
    LIMIT 1
  `;

  const user = rows[0] as UserRow | undefined;
  if (!user) return null;

  return buildAuthUser(client, user);
}
