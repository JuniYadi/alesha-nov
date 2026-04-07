import type { Migration } from "./index";

export const authMigrationsBundle: Migration[] = [
  {
    id: "001_create_auth_users",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NULL,
        image VARCHAR(2048) NULL,
        email_verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
  {
    id: "002_create_auth_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        session_token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      )
    `,
  },
  {
    id: "003_create_auth_oauth_accounts",
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
  {
    id: "004_create_auth_magic_link_tokens",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_magic_link_tokens (
        token_hash VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      )
    `,
  },
];
