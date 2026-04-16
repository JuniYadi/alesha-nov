# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.11 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.11 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile --production

COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 3000

CMD ["bun", "apps/web/dist/server/server.js"]
