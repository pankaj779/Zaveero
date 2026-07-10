# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/auth/package.json ./packages/auth/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
RUN pnpm install --frozen-lockfile --filter @graphology/api...

FROM base AS builder
ENV DATABASE_URL=postgresql://graphology:graphology@localhost:5432/graphology?schema=public
ENV DIRECT_URL=postgresql://graphology:graphology@localhost:5432/graphology?schema=public
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
COPY .env.example .env
RUN pnpm --filter @graphology/database exec prisma generate
RUN pnpm --filter @graphology/types build
RUN pnpm --filter @graphology/utils build
RUN pnpm --filter @graphology/auth build
RUN pnpm --filter @graphology/database exec tsc -p tsconfig.json
RUN pnpm --filter @graphology/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh
USER nestjs
EXPOSE 3001
ENV PORT=3001
ENV HOST=0.0.0.0
ENTRYPOINT ["./apps/api/docker-entrypoint.sh"]
