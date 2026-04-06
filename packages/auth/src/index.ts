import { createDatabaseClient, runMigrations, type DBConfig, type Migration } from "@alesha-nov/config";
import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  image?: string;
  roles?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MagicLinkInput {
  email: string;
  ttlSeconds?: number;
}

export type OAuthProvider = "google" | "github";

export interface OAuthLoginInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  roles?: string[];
}

export interface LinkOAuthAccountInput {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  providerEmail?: string;
}

export interface OAuthAccountLink {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  providerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  image: string | null;
  emailVerifiedAt: string | null;
  roles: string[];
  createdAt: string;
}

export interface AuthService {
  signup(input: SignupInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser | null>;
  issueMagicLinkToken(input: MagicLinkInput): Promise<string>;
  verifyMagicLinkToken(token: string): Promise<AuthUser | null>;
  setUserRoles(userId: string, roles: string[]): Promise<string[]>;
  getUserRoles(userId: string): Promise<string[]>;
  loginWithOAuth(input: OAuthLoginInput): Promise<AuthUser>;
  linkOAuthAccount(input: LinkOAuthAccountInput): Promise<OAuthAccountLink>;
  getLinkedAccounts(userId: string): Promise<OAuthAccountLink[]>;
}

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  image: string | null;
  email_verified_at: string | null;
  created_at: string;
};

export const authMigrations: Migration[] = [
  {
    id: "001_create_auth_users",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
  {
    id: "002_create_magic_links",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_magic_links (
        token_hash VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
  {
    id: "003_add_auth_users_name",
    sql: `
      ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL
    `,
  },
  {
    id: "004_add_auth_users_image",
    sql: `
      ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS image VARCHAR(2048) NULL
    `,
  },
  {
    id: "005_add_auth_users_email_verified_at",
    sql: `
      ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL
    `,
  },
  {
    id: "006_add_auth_users_updated_at",
    sql: `
      ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `,
  },
  {
    id: "007_create_auth_user_roles",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_user_roles (
        user_id VARCHAR(36) NOT NULL,
        role VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role),
        FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      )
    `,
  },
  {
    id: "008_create_auth_oauth_accounts",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_oauth_accounts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        provider VARCHAR(32) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        provider_email VARCHAR(320) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_account_id),
        UNIQUE(user_id, provider),
        FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      )
    `,
  },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRoles(roles: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of roles) {
    const role = raw.trim().toLowerCase();
    if (!role) continue;
    if (!/^[a-z0-9]+[a-z0-9._-]*$/.test(role)) {
      throw new Error(`Invalid role format: ${raw}`);
    }
    if (seen.has(role)) continue;
    seen.add(role);
    out.push(role);
  }

  return out;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const inputDigest = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(inputDigest, "hex"));
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newId(): string {
  return Bun.randomUUIDv7();
}

function assertProvider(provider: string): asserts provider is OAuthProvider {
  if (provider !== "google" && provider !== "github") {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

async function getUserRolesInternal(
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

async function buildAuthUser(
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

async function getUserById(
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

export async function createAuthService(dbConfig: DBConfig): Promise<AuthService> {
  const client = createDatabaseClient(dbConfig);
  await runMigrations(client, authMigrations);

  return {
    async signup(input) {
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

    async login(input) {
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

    async issueMagicLinkToken(input) {
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

    async verifyMagicLinkToken(token) {
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

    async setUserRoles(userId, roles) {
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

    async getUserRoles(userId) {
      return getUserRolesInternal(client, userId);
    },

    async loginWithOAuth(input) {
      assertProvider(input.provider);
      const provider = input.provider;
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

    async linkOAuthAccount(input) {
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

    async getLinkedAccounts(userId) {
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
