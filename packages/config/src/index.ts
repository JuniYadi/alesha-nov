import { SQL } from "bun";

export type DBType = "mysql" | "postgresql" | "sqlite";

export interface DBConfig {
  type: DBType;
  url: string;
  maxConnections?: number;
}

export interface Migration {
  id: string;
  sql: string;
}

export interface JWTConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
}

export type SessionSameSite = "lax" | "strict" | "none";

export interface SessionConfig {
  cookieName: string;
  ttlSeconds: number;
  secure: boolean;
  sameSite: SessionSameSite;
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthConfig {
  google?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
}

export interface DatabaseClient {
  sql: SQL;
  config: DBConfig;
}

export function resolveDBType(input?: string): DBType {
  switch ((input ?? process.env.DB_TYPE ?? "").toLowerCase()) {
    case "mysql":
      return "mysql";
    case "postgresql":
    case "postgres":
      return "postgresql";
    case "sqlite":
      return "sqlite";
    default:
      throw new Error(
        "Invalid DB_TYPE. Supported values: mysql | postgresql | sqlite"
      );
  }
}

export function createDatabaseClient(config: DBConfig): DatabaseClient {
  const sql = new SQL(config.url, {
    max: config.maxConnections ?? 10,
  });

  return { sql, config };
}

function readEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function parsePositiveInteger(value: string, fieldName: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}. Must be a positive integer.`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}. Must be a positive integer.`);
  }

  return parsed;
}

function parseBoolean(value: string, fieldName: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Invalid ${fieldName}. Supported values: true | false`);
}

function parseSessionSameSite(value: string): SessionSameSite {
  const normalized = value.toLowerCase();
  if (normalized === "lax" || normalized === "strict" || normalized === "none") {
    return normalized;
  }

  throw new Error(
    "Invalid session sameSite value. Supported values: lax | strict | none"
  );
}

export function resolveJWTSecret(input?: string): string {
  const secret = input?.trim() || readEnv(["AUTH_JWT_SECRET", "JWT_SECRET"]);
  if (!secret) {
    throw new Error("Missing JWT secret. Set AUTH_JWT_SECRET or JWT_SECRET.");
  }
  return secret;
}

export function resolveSessionConfig(): SessionConfig {
  const cookieName =
    readEnv(["AUTH_SESSION_COOKIE_NAME", "SESSION_COOKIE_NAME"]) ??
    "alesha_session";

  const ttlRaw = readEnv(["AUTH_SESSION_TTL_SECONDS", "SESSION_TTL_SECONDS"]);
  const secureRaw = readEnv(["AUTH_SESSION_SECURE", "SESSION_SECURE"]);
  const sameSiteRaw = readEnv(["AUTH_SESSION_SAME_SITE", "SESSION_SAME_SITE"]);

  return {
    cookieName,
    ttlSeconds: ttlRaw ? parsePositiveInteger(ttlRaw, "session ttlSeconds") : 604800,
    secure: secureRaw ? parseBoolean(secureRaw, "session secure") : false,
    sameSite: sameSiteRaw ? parseSessionSameSite(sameSiteRaw) : "lax",
  };
}

function resolveOAuthProviderConfig(provider: "google" | "github"): OAuthProviderConfig | undefined {
  const upper = provider.toUpperCase();
  const clientId = readEnv([`AUTH_OAUTH_${upper}_CLIENT_ID`, `${upper}_CLIENT_ID`]);
  const clientSecret = readEnv([
    `AUTH_OAUTH_${upper}_CLIENT_SECRET`,
    `${upper}_CLIENT_SECRET`,
  ]);
  const redirectUri = readEnv([
    `AUTH_OAUTH_${upper}_REDIRECT_URI`,
    `${upper}_REDIRECT_URI`,
  ]);

  if (!clientId && !clientSecret && !redirectUri) {
    return undefined;
  }

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      `Incomplete ${provider} OAuth env. Require CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI.`
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function resolveOAuthConfig(): OAuthConfig {
  return {
    google: resolveOAuthProviderConfig("google"),
    github: resolveOAuthProviderConfig("github"),
  };
}

export { authMigrationsBundle } from "./auth-migrations";

export async function ensureMigrationsTable(client: DatabaseClient): Promise<void> {
  const tableSql = `
    CREATE TABLE IF NOT EXISTS alesha_migrations (
      id VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await client.sql.unsafe(tableSql);
}

export async function runMigrations(
  client: DatabaseClient,
  migrations: Migration[]
): Promise<void> {
  await ensureMigrationsTable(client);

  for (const migration of migrations) {
    const existing = await client.sql`
      SELECT id FROM alesha_migrations WHERE id = ${migration.id}
    `;

    if (existing.length > 0) continue;

    await client.sql.unsafe(migration.sql);
    await client.sql`
      INSERT INTO alesha_migrations (id)
      VALUES (${migration.id})
    `;
  }
}
