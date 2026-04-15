interface SQL {
  unsafe<T = unknown>(query: string): Promise<T>;
  <T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
}

interface SQLConstructor {
  new (url: string, options?: { max?: number }): SQL;
}

interface BunRuntime {
  SQL?: SQLConstructor;
  Bun?: {
    SQL?: SQLConstructor;
  };
}

export interface ConfigOptions<T = string> {
  /**
   * Optional default value returned when no environment variable resolves.
   */
  defaultValue?: T;

  /**
   * Optional parser to transform the raw env string.
   */
  parse?: (value: string) => T;
}

/**
 * Resolve a config value from environment using Laravel-style dotted keys.
 *
 * `config('aws_s3_bucket')` -> reads `AWS_S3_BUCKET`
 * `config('filesystem.s3.bucket.name')` -> reads `FILESYSTEM_S3_BUCKET_NAME`
 */
export function config<T = string>(
  key: string,
  options: ConfigOptions<T> = {}
): T | undefined {
  const directKey = key.trim().toUpperCase();
  const dottedKey = key.trim().replace(/[.\\-]/g, "_").toUpperCase();

  const candidates = Array.from(
    new Set([directKey, dottedKey])
  ).filter(Boolean);

  for (const envKey of candidates) {
    const value = process.env[envKey]?.trim();
    if (value) {
      if (options.parse) {
        return options.parse(value);
      }

      if (options.defaultValue !== undefined) {
        return coerceConfigValue(value, options.defaultValue);
      }

      return value as T;
    }
  }

  return options.defaultValue;
}

function coerceConfigValue<T>(value: string, fallback: T): T {
  if (typeof fallback === "number") {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric config value: ${value}`);
    }
    return parsed as T;
  }

  if (typeof fallback === "boolean") {
    const normalized = value.toLowerCase();
    if (normalized === "true") return true as T;
    if (normalized === "false") return false as T;
    throw new Error(`Invalid boolean config value: ${value}`);
  }

  return value as T;
}

function resolveSQLConstructor(): SQLConstructor {
  const globalThisAsBun = globalThis as BunRuntime;

  if (typeof globalThisAsBun.SQL === "function") {
    return globalThisAsBun.SQL;
  }

  if (typeof globalThisAsBun.Bun?.SQL === "function") {
    return globalThisAsBun.Bun.SQL;
  }

  throw new Error(
    "Cannot resolve Bun SQL class. Ensure createDatabaseClient is run in Bun runtime."
  );
}

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
  switch ((input ?? config("DB_TYPE") ?? "").toLowerCase()) {
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
  const SQLConstructor = resolveSQLConstructor();

  const sql = new SQLConstructor(config.url, {
    max: config.maxConnections ?? 10,
  });

  return { sql, config };
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
  const secret =
    input?.trim() ||
    config("AUTH_JWT_SECRET") ||
    config("JWT_SECRET");
  if (!secret) {
    throw new Error("Missing JWT secret. Set AUTH_JWT_SECRET or JWT_SECRET.");
  }
  return secret;
}

export function resolveSessionConfig(): SessionConfig {
  const cookieName =
    config("AUTH_SESSION_COOKIE_NAME") ||
    config("SESSION_COOKIE_NAME") ||
    "alesha_session";

  const ttlRaw =
    config("AUTH_SESSION_TTL_SECONDS") ||
    config("SESSION_TTL_SECONDS");
  const secureRaw =
    config("AUTH_SESSION_SECURE") ||
    config("SESSION_SECURE");
  const sameSiteRaw =
    config("AUTH_SESSION_SAME_SITE") ||
    config("SESSION_SAME_SITE");

  return {
    cookieName,
    ttlSeconds: ttlRaw ? parsePositiveInteger(ttlRaw, "session ttlSeconds") : 604800,
    secure: secureRaw ? parseBoolean(secureRaw, "session secure") : false,
    sameSite: sameSiteRaw ? parseSessionSameSite(sameSiteRaw) : "lax",
  };
}

export function resolveMagicLinkConfig(): MagicLinkConfig {
  const ttlRaw =
    config("AUTH_MAGIC_LINK_TTL_SECONDS") ||
    config("MAGIC_LINK_TTL_SECONDS") ||
    "900";

  const sender =
    config("AUTH_MAGIC_LINK_SENDER") ||
    config("MAGIC_LINK_SENDER") ||
    config("AUTH_EMAIL_FROM") ||
    config("EMAIL_FROM");

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
  const region = config("AUTH_EMAIL_SES_REGION") || config("EMAIL_SES_REGION");

  if (!region) {
    throw new Error("Missing SES region. Set AUTH_EMAIL_SES_REGION or EMAIL_SES_REGION.");
  }

  return {
    type: "ses",
    ses: { region },
  };
}

function resolveSMTPTransportConfig(): EmailTransportConfig {
  const host = config("AUTH_EMAIL_SMTP_HOST") || config("EMAIL_SMTP_HOST");

  if (!host) {
    throw new Error("Missing SMTP host. Set AUTH_EMAIL_SMTP_HOST or EMAIL_SMTP_HOST.");
  }

  const portRaw =
    config("AUTH_EMAIL_SMTP_PORT") ||
    config("EMAIL_SMTP_PORT") ||
    "587";
  const secureRaw =
    config("AUTH_EMAIL_SMTP_SECURE") ||
    config("EMAIL_SMTP_SECURE") ||
    "false";
  const username =
    config("AUTH_EMAIL_SMTP_USERNAME") || config("EMAIL_SMTP_USERNAME");
  const password =
    config("AUTH_EMAIL_SMTP_PASSWORD") || config("EMAIL_SMTP_PASSWORD");

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
  const typeInput = config("AUTH_EMAIL_TRANSPORT") || config("EMAIL_TRANSPORT");

  if (!typeInput) {
    const hasSESConfig = Boolean(
      config("AUTH_EMAIL_SES_REGION") || config("EMAIL_SES_REGION")
    );
    const hasSMTPConfig = Boolean(
      config("AUTH_EMAIL_SMTP_HOST") || config("EMAIL_SMTP_HOST")
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
  const clientId =
    config(`AUTH_OAUTH_${upper}_CLIENT_ID`) || config(`${upper}_CLIENT_ID`);
  const clientSecret =
    config(`AUTH_OAUTH_${upper}_CLIENT_SECRET`) ||
    config(`${upper}_CLIENT_SECRET`);
  const redirectUri =
    config(`AUTH_OAUTH_${upper}_REDIRECT_URI`) ||
    config(`${upper}_REDIRECT_URI`);

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
