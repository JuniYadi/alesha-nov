import { createDatabaseClient, runMigrations, type DBConfig } from "@alesha-nov/config";
import { randomBytes } from "node:crypto";
import { authMigrations } from "./migrations";
import type {
  AuthService,
  LinkOAuthAccountInput,
  LoginInput,
  MagicLinkInput,
  OAuthAccountLink,
  OAuthLoginInput,
  OAuthProvider,
  SignupInput,
  UserRow,
} from "./types";
import { buildAuthUser, getUserById, getUserRolesInternal } from "./user-store";
import { assertProvider, hashPassword, hashToken, newId, normalizeEmail, normalizeRoles, verifyPassword } from "./utils";

export async function createAuthService(dbConfig: DBConfig): Promise<AuthService> {
  const client = createDatabaseClient(dbConfig);
  await runMigrations(client, authMigrations);

  return {
    async signup(input: SignupInput) {
      const id = newId();
      const email = normalizeEmail(input.email);
      const passwordHash = hashPassword(input.password);
      const roles = normalizeRoles(input.roles ?? []);

      await client.sql`
        INSERT INTO auth_users (id, email, password_hash, name, image)
        VALUES (${id}, ${email}, ${passwordHash}, ${input.name ?? null}, ${input.image ?? null})
      `;

      if (roles.length > 0) {
        for (const role of roles) {
          await client.sql`
            INSERT INTO auth_user_roles (user_id, role)
            VALUES (${id}, ${role})
          `;
        }
      }

      const created = await getUserById(client, id);
      if (!created) throw new Error("Failed to load created user");
      return created;
    },

    async login(input: LoginInput) {
      const rows = await client.sql`
        SELECT id, email, password_hash, name, image, email_verified_at, created_at
        FROM auth_users
        WHERE email = ${normalizeEmail(input.email)}
        LIMIT 1
      `;

      const user = rows[0] as UserRow | undefined;
      if (!user) return null;
      if (!verifyPassword(input.password, user.password_hash)) return null;

      return buildAuthUser(client, user);
    },

    async issueMagicLinkToken(input: MagicLinkInput) {
      const rows = await client.sql`
        SELECT id FROM auth_users WHERE email = ${normalizeEmail(input.email)} LIMIT 1
      `;
      const user = rows[0] as { id: string } | undefined;
      if (!user) throw new Error("User not found");

      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(rawToken);
      const ttlSeconds = input.ttlSeconds ?? 15 * 60;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      await client.sql`
        INSERT INTO auth_magic_links (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${user.id}, ${expiresAt})
      `;

      return rawToken;
    },

    async verifyMagicLinkToken(token: string) {
      const tokenHash = hashToken(token);
      const rows = await client.sql`
        SELECT aml.user_id, aml.expires_at, aml.used_at, u.id, u.email, u.password_hash, u.name, u.image, u.email_verified_at, u.created_at
        FROM auth_magic_links aml
        JOIN auth_users u ON u.id = aml.user_id
        WHERE aml.token_hash = ${tokenHash}
        LIMIT 1
      `;

      const row = rows[0] as
        | {
            user_id: string;
            expires_at: string;
            used_at: string | null;
            id: string;
            email: string;
            password_hash: string;
            name: string | null;
            image: string | null;
            email_verified_at: string | null;
            created_at: string;
          }
        | undefined;

      if (!row) return null;
      if (row.used_at) return null;
      if (new Date(row.expires_at).getTime() < Date.now()) return null;

      await client.sql`
        UPDATE auth_magic_links
        SET used_at = ${new Date().toISOString()}
        WHERE token_hash = ${tokenHash}
      `;

      await client.sql`
        UPDATE auth_users
        SET email_verified_at = COALESCE(email_verified_at, ${new Date().toISOString()})
        WHERE id = ${row.id}
      `;

      return buildAuthUser(client, {
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        name: row.name,
        image: row.image,
        email_verified_at: row.email_verified_at,
        created_at: row.created_at,
      });
    },

    async setUserRoles(userId: string, roles: string[]) {
      const normalizedRoles = normalizeRoles(roles);
      const existingUser = await getUserById(client, userId);
      if (!existingUser) throw new Error("User not found");

      await client.sql`
        DELETE FROM auth_user_roles
        WHERE user_id = ${userId}
      `;

      for (const role of normalizedRoles) {
        await client.sql`
          INSERT INTO auth_user_roles (user_id, role)
          VALUES (${userId}, ${role})
        `;
      }

      return normalizedRoles;
    },

    async getUserRoles(userId: string) {
      return getUserRolesInternal(client, userId);
    },

    async loginWithOAuth(input: OAuthLoginInput) {
      assertProvider(input.provider);
      const provider: OAuthProvider = input.provider;
      const providerAccountId = input.providerAccountId.trim();
      const email = normalizeEmail(input.email);

      if (!providerAccountId) {
        throw new Error("providerAccountId is required");
      }

      const linkedRows = await client.sql`
        SELECT u.id, u.email, u.password_hash, u.name, u.image, u.email_verified_at, u.created_at
        FROM auth_oauth_accounts oa
        JOIN auth_users u ON u.id = oa.user_id
        WHERE oa.provider = ${provider}
          AND oa.provider_account_id = ${providerAccountId}
        LIMIT 1
      `;

      const linkedUser = linkedRows[0] as UserRow | undefined;
      if (linkedUser) {
        if (input.name || input.image || input.emailVerified) {
          await client.sql`
            UPDATE auth_users
            SET
              name = COALESCE(${input.name ?? null}, name),
              image = COALESCE(${input.image ?? null}, image),
              email_verified_at = COALESCE(email_verified_at, ${input.emailVerified ? new Date().toISOString() : null})
            WHERE id = ${linkedUser.id}
          `;
        }

        const refreshed = await getUserById(client, linkedUser.id);
        if (!refreshed) throw new Error("Linked user not found");
        return refreshed;
      }

      const existingRows = await client.sql`
        SELECT id, email, password_hash, name, image, email_verified_at, created_at
        FROM auth_users
        WHERE email = ${email}
        LIMIT 1
      `;

      const existingUser = existingRows[0] as UserRow | undefined;
      let userId: string;

      if (existingUser) {
        userId = existingUser.id;

        await client.sql`
          UPDATE auth_users
          SET
            name = COALESCE(${input.name ?? null}, name),
            image = COALESCE(${input.image ?? null}, image),
            email_verified_at = COALESCE(email_verified_at, ${input.emailVerified ? new Date().toISOString() : null})
          WHERE id = ${userId}
        `;
      } else {
        userId = newId();
        const oauthOnlyPasswordHash = `oauth:${provider}:${providerAccountId}`;

        await client.sql`
          INSERT INTO auth_users (id, email, password_hash, name, image, email_verified_at)
          VALUES (
            ${userId},
            ${email},
            ${oauthOnlyPasswordHash},
            ${input.name ?? null},
            ${input.image ?? null},
            ${input.emailVerified ? new Date().toISOString() : null}
          )
        `;

        const newRoles = normalizeRoles(input.roles ?? []);
        for (const role of newRoles) {
          await client.sql`
            INSERT INTO auth_user_roles (user_id, role)
            VALUES (${userId}, ${role})
          `;
        }
      }

      await client.sql`
        INSERT INTO auth_oauth_accounts (id, user_id, provider, provider_account_id, provider_email)
        VALUES (${newId()}, ${userId}, ${provider}, ${providerAccountId}, ${email})
      `;

      const finalUser = await getUserById(client, userId);
      if (!finalUser) throw new Error("Failed to load OAuth user");
      return finalUser;
    },

    async linkOAuthAccount(input: LinkOAuthAccountInput) {
      assertProvider(input.provider);
      const provider = input.provider;
      const providerAccountId = input.providerAccountId.trim();
      if (!providerAccountId) throw new Error("providerAccountId is required");

      const user = await getUserById(client, input.userId);
      if (!user) throw new Error("User not found");

      const existingProviderAccountRows = await client.sql`
        SELECT id, user_id, provider, provider_account_id, provider_email, created_at, updated_at
        FROM auth_oauth_accounts
        WHERE provider = ${provider}
          AND provider_account_id = ${providerAccountId}
        LIMIT 1
      `;

      const existingProviderAccount = existingProviderAccountRows[0] as
        | {
            id: string;
            user_id: string;
            provider: OAuthProvider;
            provider_account_id: string;
            provider_email: string | null;
            created_at: string;
            updated_at: string;
          }
        | undefined;

      if (existingProviderAccount) {
        if (existingProviderAccount.user_id !== input.userId) {
          throw new Error("OAuth account already linked to another user");
        }

        return {
          id: existingProviderAccount.id,
          userId: existingProviderAccount.user_id,
          provider: existingProviderAccount.provider,
          providerAccountId: existingProviderAccount.provider_account_id,
          providerEmail: existingProviderAccount.provider_email,
          createdAt: String(existingProviderAccount.created_at),
          updatedAt: String(existingProviderAccount.updated_at),
        };
      }

      const existingUserProviderRows = await client.sql`
        SELECT id
        FROM auth_oauth_accounts
        WHERE user_id = ${input.userId}
          AND provider = ${provider}
        LIMIT 1
      `;

      if (existingUserProviderRows.length > 0) {
        throw new Error(`User already linked with provider ${provider}`);
      }

      const id = newId();
      const providerEmail = input.providerEmail ? normalizeEmail(input.providerEmail) : null;

      await client.sql`
        INSERT INTO auth_oauth_accounts (id, user_id, provider, provider_account_id, provider_email)
        VALUES (${id}, ${input.userId}, ${provider}, ${providerAccountId}, ${providerEmail})
      `;

      const rows = await client.sql`
        SELECT id, user_id, provider, provider_account_id, provider_email, created_at, updated_at
        FROM auth_oauth_accounts
        WHERE id = ${id}
        LIMIT 1
      `;

      const created = rows[0] as
        | {
            id: string;
            user_id: string;
            provider: OAuthProvider;
            provider_account_id: string;
            provider_email: string | null;
            created_at: string;
            updated_at: string;
          }
        | undefined;

      if (!created) throw new Error("Failed to load linked OAuth account");

      return {
        id: created.id,
        userId: created.user_id,
        provider: created.provider,
        providerAccountId: created.provider_account_id,
        providerEmail: created.provider_email,
        createdAt: String(created.created_at),
        updatedAt: String(created.updated_at),
      };
    },

    async getLinkedAccounts(userId: string) {
      const rows = await client.sql`
        SELECT id, user_id, provider, provider_account_id, provider_email, created_at, updated_at
        FROM auth_oauth_accounts
        WHERE user_id = ${userId}
        ORDER BY provider ASC
      `;

      return rows.map(
        (row: {
          id: string;
          user_id: string;
          provider: OAuthProvider;
          provider_account_id: string;
          provider_email: string | null;
          created_at: string;
          updated_at: string;
        }): OAuthAccountLink => ({
          id: row.id,
          userId: row.user_id,
          provider: row.provider,
          providerAccountId: row.provider_account_id,
          providerEmail: row.provider_email,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        })
      );
    },
  };
}
