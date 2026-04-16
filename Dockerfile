# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.11 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts ./apps/web/
COPY packages/config/package.json packages/config/tsconfig.json ./packages/config/
COPY packages/email/package.json packages/email/tsconfig.json ./packages/email/
COPY packages/auth/package.json packages/auth/tsconfig.json ./packages/auth/
COPY packages/auth-web/package.json packages/auth-web/tsconfig.json ./packages/auth-web/
COPY packages/auth-react/package.json packages/auth-react/tsconfig.json ./packages/auth-react/

RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.11 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/email/package.json ./packages/email/
COPY packages/auth/package.json ./packages/auth/
COPY packages/auth-web/package.json ./packages/auth-web/
COPY packages/auth-react/package.json ./packages/auth-react/

RUN bun install --frozen-lockfile --production

COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 3000

CMD ["bun", "apps/web/dist/server/server.js"]
