# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.11 AS builder
WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --filter web build

FROM oven/bun:1.3.11 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 3000

CMD ["bun", "apps/web/dist/server/server.js"]
