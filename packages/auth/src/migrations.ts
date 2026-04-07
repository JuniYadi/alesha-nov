import type { Migration } from "@alesha-nov/config";

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
  {
    id: "009_create_password_reset_tokens",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
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
