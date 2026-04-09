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

export interface MagicLinkConfig {
  ttlSeconds: number;
  sender: string;
}

export type EmailTransportType = "ses" | "smtp";

export interface EmailSESTransportConfig {
  region: string;
}

export interface EmailSMTPTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
}

export interface EmailTransportConfig {
  type: EmailTransportType;
  ses?: EmailSESTransportConfig;
  smtp?: EmailSMTPTransportConfig;
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

export function resolveMagicLinkConfig(): MagicLinkConfig {
  const ttlRaw =
    readEnv(["AUTH_MAGIC_LINK_TTL_SECONDS", "MAGIC_LINK_TTL_SECONDS"]) ??
    "900";

  const sender = readEnv([
    "AUTH_MAGIC_LINK_SENDER",
    "MAGIC_LINK_SENDER",
    "AUTH_EMAIL_FROM",
    "EMAIL_FROM",
  ]);

  if (!sender) {
    throw new Error(
      "Missing magic-link sender. Set AUTH_MAGIC_LINK_SENDER, MAGIC_LINK_SENDER, AUTH_EMAIL_FROM, or EMAIL_FROM."
    );
  }

  if (!sender.includes("@")) {
    throw new Error("Invalid magic-link sender. Must be a valid email address.");
  }

  return {
    ttlSeconds: parsePositiveInteger(ttlRaw, "magic-link ttlSeconds"),
    sender,
  };
}

function resolveSESTransportConfig(): EmailTransportConfig {
  const region = readEnv(["AUTH_EMAIL_SES_REGION", "EMAIL_SES_REGION"]);

  if (!region) {
    throw new Error("Missing SES region. Set AUTH_EMAIL_SES_REGION or EMAIL_SES_REGION.");
  }

  return {
    type: "ses",
    ses: { region },
  };
}

function resolveSMTPTransportConfig(): EmailTransportConfig {
  const host = readEnv(["AUTH_EMAIL_SMTP_HOST", "EMAIL_SMTP_HOST"]);

  if (!host) {
    throw new Error("Missing SMTP host. Set AUTH_EMAIL_SMTP_HOST or EMAIL_SMTP_HOST.");
  }

  const portRaw = readEnv(["AUTH_EMAIL_SMTP_PORT", "EMAIL_SMTP_PORT"]) ?? "587";
  const secureRaw =
    readEnv(["AUTH_EMAIL_SMTP_SECURE", "EMAIL_SMTP_SECURE"]) ?? "false";
  const username = readEnv(["AUTH_EMAIL_SMTP_USERNAME", "EMAIL_SMTP_USERNAME"]);
  const password = readEnv(["AUTH_EMAIL_SMTP_PASSWORD", "EMAIL_SMTP_PASSWORD"]);

  const port = parsePositiveInteger(portRaw, "smtp port");
  if (port > 65535) {
    throw new Error("Invalid smtp port. Must be between 1 and 65535.");
  }

  return {
    type: "smtp",
    smtp: {
      host,
      port,
      secure: parseBoolean(secureRaw, "smtp secure"),
      username,
      password,
    },
  };
}

export function resolveEmailTransportConfig(): EmailTransportConfig | undefined {
  const typeInput = readEnv(["AUTH_EMAIL_TRANSPORT", "EMAIL_TRANSPORT"]);

  if (!typeInput) {
    const hasSESConfig = Boolean(
      readEnv(["AUTH_EMAIL_SES_REGION", "EMAIL_SES_REGION"])
    );
    const hasSMTPConfig = Boolean(
      readEnv(["AUTH_EMAIL_SMTP_HOST", "EMAIL_SMTP_HOST"])
    );

    if (!hasSESConfig && !hasSMTPConfig) {
      return undefined;
    }

    if (hasSESConfig && hasSMTPConfig) {
      throw new Error(
        "Ambiguous email transport config. Set AUTH_EMAIL_TRANSPORT (ses|smtp)."
      );
    }

    return hasSESConfig ? resolveSESTransportConfig() : resolveSMTPTransportConfig();
  }

  const type = typeInput.toLowerCase();

  if (type === "ses") {
    return resolveSESTransportConfig();
  }

  if (type === "smtp") {
    return resolveSMTPTransportConfig();
  }

  throw new Error("Invalid email transport. Supported values: ses | smtp");
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
