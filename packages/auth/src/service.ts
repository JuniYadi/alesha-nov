import { createDatabaseClient, runMigrations, type DBConfig } from "@alesha-nov/db";
import { resolveAppConfig, resolveEmailTransportConfig, resolveMagicLinkConfig } from "@alesha-nov/config";
import { createSesProvider, createSmtpProvider, type EmailProvider } from "@alesha-nov/email";
import { randomBytes } from "node:crypto";
import { authMigrations } from "./migrations";
import type {
  AuthAuditEvent,
  AuthAuditSink,
  AuthEmailDeliveryContext,
  AuthEmailFlow,
  AuthEmailFlowDeliveryOptions,
  AuthEmailOptions,
  AuthService,
  AuthServiceOptions,
  AuthSession,
  AuthSessionStrategy,
  EmailVerificationInput,
  LinkOAuthAccountInput,
  LoginInput,
  LoginProtectionConfig,
  MagicLinkInput,
  OAuthAccountLink,
  OAuthCallbackValidationInput,
  OAuthCallbackValidationResult,
  OAuthLoginInput,
  OAuthPKCEProviderMap,
  OAuthProvider,
  PasswordPolicyValidationResult,
  PasswordPolicyValidator,
  PasswordResetInput,
  ResetPasswordInput,
  SignupInput,
  UserRow,
} from "./types";
import { buildAuthUser, getUserById, getUserRolesInternal } from "./user-store";
import { assertProvider, hashPassword, hashToken, newId, normalizeEmail, normalizeRoles, verifyPassword } from "./utils";

type LoginAttemptState = {
  attempts: number[];
  lockedUntil: number;
};

type SessionRecord = {
  userId: string;
  expiresAt: number;
};

const DEFAULT_LOGIN_PROTECTION: LoginProtectionConfig = {
  maxAttempts: 5,
  lockoutSeconds: 300,
  windowSeconds: 300,
};

const OAUTH_PKCE_PROVIDERS: OAuthPKCEProviderMap = {
  google: { authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth" },
  github: { authorizeUrl: "https://github.com/login/oauth/authorize" },
};

class InMemoryAuthSessionStrategy implements AuthSessionStrategy {
  private readonly refreshStore = new Map<string, SessionRecord>();

  async issueSession(user: { id: string }): Promise<AuthSession> {
    const accessToken = randomBytes(24).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresInSeconds = 15 * 60;
    const refreshExpiresInSeconds = 7 * 24 * 60 * 60;

    this.refreshStore.set(refreshToken, {
      userId: user.id,
      expiresAt: Date.now() + refreshExpiresInSeconds * 1000,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresInSeconds,
      refreshExpiresInSeconds,
      subject: user.id,
    };
  }

  async refreshSession(refreshToken: string): Promise<AuthSession | null> {
    const record = this.refreshStore.get(refreshToken);
    if (!record) return null;

    if (record.expiresAt < Date.now()) {
      this.refreshStore.delete(refreshToken);
      return null;
    }

    this.refreshStore.delete(refreshToken);

    const accessToken = randomBytes(24).toString("base64url");
    const nextRefreshToken = randomBytes(32).toString("base64url");
    const expiresInSeconds = 15 * 60;
    const refreshExpiresInSeconds = 7 * 24 * 60 * 60;

    this.refreshStore.set(nextRefreshToken, {
      userId: record.userId,
      expiresAt: Date.now() + refreshExpiresInSeconds * 1000,
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      tokenType: "Bearer",
      expiresInSeconds,
      refreshExpiresInSeconds,
      subject: record.userId,
    };
  }
}

const defaultPasswordPolicyValidator: PasswordPolicyValidator = {
  validate(): PasswordPolicyValidationResult {
    return {
      valid: true,
      errors: [],
    };
  },
};

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createOAuthCodeVerifier(): string {
  return toBase64Url(randomBytes(48));
}

function createOAuthCodeChallenge(codeVerifier: string): string {
  return hashToken(codeVerifier);
}

function createOAuthState(): string {
  return toBase64Url(randomBytes(18));
}

async function emitAuditEvent(auditSink: AuthAuditSink | undefined, event: AuthAuditEvent): Promise<void> {
  if (!auditSink) return;
  await auditSink.emit(event);
}

function buildDefaultAuthEmail(flow: AuthEmailFlow, context: AuthEmailDeliveryContext): {
  subject: string;
  html: string;
  text: string;
} {
  const expiresInMinutes = Math.max(1, Math.ceil(context.ttlSeconds / 60));

  if (flow === "magic-link") {
    let appUrl = "http://localhost:3000";
    try {
      appUrl = resolveAppConfig().url;
    } catch {
      // Keep localhost default when app config is unavailable.
    }
    const magicLinkUrl = `${appUrl}/auth/magic-link/verify?token=${encodeURIComponent(context.token)}`;
    const subject = "Your Magic Link";
    const html = `<p>Hi,</p><p>Click <a href="${magicLinkUrl}">here</a> to sign in. This link expires in ${expiresInMinutes} minutes.</p>`;
    const text = `Hi,\n\nVisit this link to sign in: ${magicLinkUrl}\nExpires in ${expiresInMinutes} minutes.`;
    return { subject, html, text };
  }

  if (flow === "password-reset") {
    const subject = "Reset Your Password";
    const html = `<p>Hi,</p><p>Your password reset code is: <strong>${context.token}</strong>. It expires in ${expiresInMinutes} minutes.</p>`;
    const text = `Hi,\n\nPassword reset code: ${context.token}\nExpires in ${expiresInMinutes} minutes.`;
    return { subject, html, text };
  }

  const subject = "Verify Your Email";
  const html = `<p>Hi,</p><p>Your verification code is: <strong>${context.token}</strong>. It expires in ${expiresInMinutes} minutes.</p>`;
  const text = `Hi,\n\nYour verification code: ${context.token}\nExpires in ${expiresInMinutes} minutes.`;
  return { subject, html, text };
}

function resolveFlowOptions(options: AuthServiceOptions, flow: AuthEmailFlow): AuthEmailFlowDeliveryOptions | undefined {
  const emailOptions = options.email;
  if (!emailOptions) return undefined;

  switch (flow) {
    case "magic-link":
      return emailOptions.magicLink;
    case "password-reset":
      return emailOptions.passwordReset;
    case "email-verification":
      return emailOptions.emailVerification;
  }
}

async function maybeDeliverAuthTokenEmail(
  options: AuthServiceOptions,
  flow: AuthEmailFlow,
  context: AuthEmailDeliveryContext
): Promise<void> {
  const emailOptions = options.email;
  if (!emailOptions) return;

  const flowOptions = resolveFlowOptions(options, flow);
  if (flowOptions?.enabled === false) return;

  const rendered = flowOptions?.render?.(context) ?? buildDefaultAuthEmail(flow, context);
  const to = flowOptions?.to?.(context) ?? context.email;
  const from = flowOptions?.from ?? emailOptions.from;

  await emailOptions.provider.send({
    from,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

function pruneAttempts(attemptState: LoginAttemptState, windowSeconds: number): void {
  const windowStart = Date.now() - windowSeconds * 1000;
  attemptState.attempts = attemptState.attempts.filter((ts) => ts >= windowStart);
}

function ensureLoginAllowed(loginAttempts: Map<string, LoginAttemptState>, key: string, config: LoginProtectionConfig): string | null {
  const state = loginAttempts.get(key);
  if (!state) return null;

  pruneAttempts(state, config.windowSeconds);

  if (state.lockedUntil > Date.now()) {
    const waitSeconds = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return `Account locked. Try again in ${waitSeconds} seconds`;
  }

  return null;
}

function recordLoginFailure(loginAttempts: Map<string, LoginAttemptState>, key: string, config: LoginProtectionConfig): void {
  const state = loginAttempts.get(key) ?? { attempts: [], lockedUntil: 0 };
  pruneAttempts(state, config.windowSeconds);
  state.attempts.push(Date.now());

  if (state.attempts.length >= config.maxAttempts) {
    state.lockedUntil = Date.now() + config.lockoutSeconds * 1000;
    state.attempts = [];
  }

  loginAttempts.set(key, state);
}

function clearLoginFailures(loginAttempts: Map<string, LoginAttemptState>, key: string): void {
  loginAttempts.delete(key);
}

function resolveEmailOptionsFromEnv(): AuthEmailOptions | undefined {
  const transportConfig = resolveEmailTransportConfig();
  if (!transportConfig) return undefined;

  let provider: EmailProvider;
  if (transportConfig.type === "ses") {
    provider = createSesProvider({
      region: transportConfig.ses!.region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    });
  } else {
    provider = createSmtpProvider({
      host: transportConfig.smtp!.host,
      port: transportConfig.smtp!.port,
      secure: transportConfig.smtp!.secure,
      user: transportConfig.smtp!.username ?? "",
      pass: transportConfig.smtp!.password ?? "",
    });
  }

  let from: string;
  try {
    from = resolveMagicLinkConfig().sender;
  } catch {
    from = process.env.AUTH_EMAIL_FROM ?? process.env.EMAIL_FROM ?? "noreply@example.com";
  }

  return { provider, from };
}

export async function createAuthService(
  dbConfig: DBConfig,
  options: AuthServiceOptions = {},
  providedClient?: ReturnType<typeof createDatabaseClient>,
): Promise<AuthService> {
  const client = providedClient ?? createDatabaseClient(dbConfig);
  await runMigrations(client, authMigrations);

  const emailOptions = options.email ?? resolveEmailOptionsFromEnv();
  const resolvedOptions: AuthServiceOptions = { ...options, email: emailOptions };

  const passwordPolicyValidator = resolvedOptions.passwordPolicyValidator ?? defaultPasswordPolicyValidator;
  const auditSink = resolvedOptions.auditSink;
  const loginProtection = resolvedOptions.loginProtection ?? DEFAULT_LOGIN_PROTECTION;
  const sessionStrategy = resolvedOptions.sessionStrategy ?? new InMemoryAuthSessionStrategy();
  const loginAttempts = new Map<string, LoginAttemptState>();

  return {
    async signup(input: SignupInput) {
      const id = newId();
      const email = normalizeEmail(input.email);
      const passwordValidation = passwordPolicyValidator.validate(input.password);
      if (!passwordValidation.valid) {
        throw new Error((passwordValidation.errors ?? ["Password policy validation failed"]).join("; "));
      }

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

      await emitAuditEvent(auditSink, {
        type: "SIGNUP",
        userId: created.id,
        email: created.email,
        metadata: { roleCount: created.roles.length },
        occurredAt: new Date().toISOString(),
      });

      return created;
    },

    buildOAuthAuthorizeRequest(input) {
      assertProvider(input.provider);

      const providerConfig = OAUTH_PKCE_PROVIDERS[input.provider];
      const state = input.state?.trim() ? input.state.trim() : createOAuthState();
      const codeVerifier = createOAuthCodeVerifier();
      const codeChallenge = createOAuthCodeChallenge(codeVerifier);
      const scope = input.scope.map((value) => value.trim()).filter((value) => value.length > 0).join(" ");

      const authorizeUrl = new URL(providerConfig.authorizeUrl);
      authorizeUrl.searchParams.set("client_id", input.clientId);
      authorizeUrl.searchParams.set("redirect_uri", input.redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", scope);
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", codeChallenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");

      return {
        provider: input.provider,
        authorizationUrl: authorizeUrl.toString(),
        state,
        codeVerifier,
        codeChallenge,
        codeChallengeMethod: "S256",
      };
    },

    validateOAuthCallback(input: OAuthCallbackValidationInput): OAuthCallbackValidationResult {
      assertProvider(input.callback.provider);

      if (input.callback.error) {
        return {
          valid: false,
          reason: input.callback.error,
        };
      }

      if (!input.callback.state || input.callback.state !== input.expectedState) {
        return {
          valid: false,
          reason: "Invalid OAuth state",
        };
      }

      if (!input.callback.code) {
        return {
          valid: false,
          reason: "Missing authorization code",
        };
      }

      if (!input.codeVerifier || input.codeVerifier.length < 43) {
        return {
          valid: false,
          reason: "Invalid PKCE code verifier",
        };
      }

      return {
        valid: true,
      };
    },

    async login(input: LoginInput) {
      const normalizedEmail = normalizeEmail(input.email);
      const lockReason = ensureLoginAllowed(loginAttempts, normalizedEmail, loginProtection);
      if (lockReason) {
        await emitAuditEvent(auditSink, {
          type: "LOGIN_FAIL",
          email: normalizedEmail,
          reason: lockReason,
          occurredAt: new Date().toISOString(),
        });
        throw new Error(lockReason);
      }

      const rows = await client.sql`
        SELECT id, email, password_hash, name, image, email_verified_at, created_at
        FROM auth_users
        WHERE email = ${normalizedEmail}
        LIMIT 1
      `;

      const user = rows[0] as UserRow | undefined;
      if (!user) {
        recordLoginFailure(loginAttempts, normalizedEmail, loginProtection);
        await emitAuditEvent(auditSink, {
          type: "LOGIN_FAIL",
          email: normalizedEmail,
          reason: "Invalid credentials",
          occurredAt: new Date().toISOString(),
        });
        return null;
      }

      if (!verifyPassword(input.password, user.password_hash)) {
        recordLoginFailure(loginAttempts, normalizedEmail, loginProtection);
        await emitAuditEvent(auditSink, {
          type: "LOGIN_FAIL",
          userId: user.id,
          email: normalizedEmail,
          reason: "Invalid credentials",
          occurredAt: new Date().toISOString(),
        });
        return null;
      }

      clearLoginFailures(loginAttempts, normalizedEmail);
      const built = await buildAuthUser(client, user);
      await emitAuditEvent(auditSink, {
        type: "LOGIN",
        userId: built.id,
        email: built.email,
        occurredAt: new Date().toISOString(),
      });

      return built;
    },

    async issueSession(userId: string) {
      const user = await getUserById(client, userId);
      if (!user) {
        throw new Error("User not found");
      }

      const session = await sessionStrategy.issueSession(user);
      await emitAuditEvent(auditSink, {
        type: "SESSION_ISSUED",
        userId: user.id,
        email: user.email,
        metadata: { expiresInSeconds: session.expiresInSeconds },
        occurredAt: new Date().toISOString(),
      });

      return session;
    },

    async refreshSession(refreshToken: string) {
      const refreshed = await sessionStrategy.refreshSession(refreshToken);
      if (!refreshed) {
        await emitAuditEvent(auditSink, {
          type: "SESSION_REFRESH_FAIL",
          reason: "Invalid refresh token",
          occurredAt: new Date().toISOString(),
        });
        return null;
      }

      await emitAuditEvent(auditSink, {
        type: "SESSION_REFRESH",
        userId: refreshed.subject,
        metadata: { expiresInSeconds: refreshed.expiresInSeconds },
        occurredAt: new Date().toISOString(),
      });

      return refreshed;
    },

    async issueMagicLinkToken(input: MagicLinkInput) {
      const email = normalizeEmail(input.email);
      const rows = await client.sql`
        SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
      `;
      let user = rows[0] as { id: string } | undefined;

      if (!user) {
        const userId = newId();
        const generatedPasswordHash = hashPassword(randomBytes(48).toString("hex"));
        const now = new Date().toISOString();

        await client.sql`
          INSERT INTO auth_users (id, email, password_hash, name, image, email_verified_at)
          VALUES (${userId}, ${email}, ${generatedPasswordHash}, NULL, NULL, ${now})
        `;

        await emitAuditEvent(auditSink, {
          type: "SIGNUP",
          userId,
          email,
          metadata: { roleCount: 0 },
          occurredAt: now,
        });

        user = { id: userId };
      }

      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(rawToken);
      const ttlSeconds = input.ttlSeconds ?? 15 * 60;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      await client.sql`
        INSERT INTO auth_magic_link_tokens (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${user.id}, ${expiresAt})
      `;

      await maybeDeliverAuthTokenEmail(resolvedOptions, "magic-link", {
        flow: "magic-link",
        email,
        token: rawToken,
        ttlSeconds,
        expiresAt,
      });
    },

    async verifyMagicLinkToken(token: string) {
      const tokenHash = hashToken(token);
      const rows = await client.sql`
        SELECT aml.user_id, aml.expires_at, aml.used_at, u.id, u.email, u.password_hash, u.name, u.image, u.email_verified_at, u.created_at
        FROM auth_magic_link_tokens aml
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
        UPDATE auth_magic_link_tokens
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

    async issuePasswordResetToken(input: PasswordResetInput) {
      const email = normalizeEmail(input.email);
      const rows = await client.sql`
        SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
      `;
      const user = rows[0] as { id: string } | undefined;
      if (!user) throw new Error("User not found");

      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(rawToken);
      const ttlSeconds = input.ttlSeconds ?? 60 * 60; // 1 hour default
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      await client.sql`
        INSERT INTO auth_password_reset_tokens (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${user.id}, ${expiresAt})
      `;

      await maybeDeliverAuthTokenEmail(resolvedOptions, "password-reset", {
        flow: "password-reset",
        email,
        token: rawToken,
        ttlSeconds,
        expiresAt,
      });

      return rawToken;
    },

    async resetPassword(input: ResetPasswordInput) {
      const tokenHash = hashToken(input.token);
      const rows = await client.sql`
        SELECT user_id, expires_at, used_at FROM auth_password_reset_tokens WHERE token_hash = ${tokenHash} LIMIT 1
      `;

      const row = rows[0] as { user_id: string; expires_at: string; used_at: string | null } | undefined;

      if (!row) {
        await emitAuditEvent(auditSink, {
          type: "PASSWORD_RESET_FAIL",
          reason: "Token not found",
          occurredAt: new Date().toISOString(),
        });
        return false;
      }
      if (row.used_at) {
        await emitAuditEvent(auditSink, {
          type: "PASSWORD_RESET_FAIL",
          userId: row.user_id,
          reason: "Token already used",
          occurredAt: new Date().toISOString(),
        });
        return false;
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await emitAuditEvent(auditSink, {
          type: "PASSWORD_RESET_FAIL",
          userId: row.user_id,
          reason: "Token expired",
          occurredAt: new Date().toISOString(),
        });
        return false;
      }

      const passwordValidation = passwordPolicyValidator.validate(input.newPassword);
      if (!passwordValidation.valid) {
        throw new Error((passwordValidation.errors ?? ["Password policy validation failed"]).join("; "));
      }

      const passwordHash = hashPassword(input.newPassword);

      await client.sql`
        UPDATE auth_users
        SET password_hash = ${passwordHash}
        WHERE id = ${row.user_id}
      `;

      await client.sql`
        UPDATE auth_password_reset_tokens
        SET used_at = ${new Date().toISOString()}
        WHERE token_hash = ${tokenHash}
      `;

      await emitAuditEvent(auditSink, {
        type: "PASSWORD_RESET",
        userId: row.user_id,
        occurredAt: new Date().toISOString(),
      });

      return true;
    },

    async issueEmailVerificationToken(input: EmailVerificationInput) {
      const email = normalizeEmail(input.email);
      const rows = await client.sql`
        SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
      `;
      const user = rows[0] as { id: string } | undefined;
      if (!user) throw new Error("User not found");

      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(rawToken);
      const ttlSeconds = input.ttlSeconds ?? 60 * 60; // 1 hour default
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      await client.sql`
        INSERT INTO auth_email_verification_tokens (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${user.id}, ${expiresAt})
      `;

      await maybeDeliverAuthTokenEmail(resolvedOptions, "email-verification", {
        flow: "email-verification",
        email,
        token: rawToken,
        ttlSeconds,
        expiresAt,
      });

      return rawToken;
    },

    async verifyEmailVerificationToken(token: string) {
      const tokenHash = hashToken(token);
      const rows = await client.sql`
        SELECT aevt.user_id, aevt.expires_at, aevt.used_at,
               u.id, u.email, u.password_hash, u.name, u.image, u.email_verified_at, u.created_at
        FROM auth_email_verification_tokens aevt
        JOIN auth_users u ON u.id = aevt.user_id
        WHERE aevt.token_hash = ${tokenHash}
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
        UPDATE auth_email_verification_tokens
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
