# syntax=docker/dockerfile:1
# Production: build then run node server.js (do NOT use next dev on server)
#
# NODE 24, NOT NODE 20 — AND THE PIN IS PART OF THE BUILD CONTRACT, NOT A PREFERENCE.
#
# `RUN npm run build` below runs the `prebuild` chain, whose sitemap-crawl check imports
# src/util/sitemapCrawl.ts DIRECTLY (a .ts specifier) so that what it exercises is the code that
# ships rather than a paraphrase of it. Node strips those types from 22.6 on; Node 20 answers
# `node: bad option: --experimental-strip-types`, exit 9, and the image build dies before Next.js is
# ever invoked. The version was left at 20 when that check was added, which meant NOTHING could
# build — not here and not in .github/workflows/deploy-frontend.yml, which was pinned to 20 as well.
#
# Both pins move together, and frontend/package.json `engines.node` (>=22.6) plus frontend/.nvmrc
# record the floor so a laptop cannot silently disagree with the image. Node 20 also went end of
# life in April 2026, so staying on it was a security position nobody had chosen either.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install devDependencies too (tailwindcss, postcss, etc.) - NODE_ENV=production would skip them
ENV NODE_ENV=development
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build args for API/Storage URLs (used by GitHub Actions; .env overrides when building locally)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STORAGE_URL
ARG API_BACKEND_URL
ARG STORAGE_BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STORAGE_URL=$NEXT_PUBLIC_STORAGE_URL
ENV API_BACKEND_URL=$API_BACKEND_URL
ENV STORAGE_BACKEND_URL=$STORAGE_BACKEND_URL
ENV NODE_OPTIONS=--no-deprecation
# `npm run build`, NOT `npx next build`.
#
# The npm script carries the prebuild and postbuild hooks; calling next directly skips both. That
# meant scripts/check-reserved-routes.mjs — written specifically to fail the build when a top-level
# route is missing from isReservedRouteSlug — has never once run in the build that actually ships.
# A guard that only runs on a developer's laptop is not a guard.
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create the runtime user BEFORE the COPYs so the tree can be chowned to it.
#
# WHY THIS ORDER MATTERS: previously the COPYs ran as root and created a root-owned /app/.next,
# with `USER nextjs` (uid 1001) applied afterwards. Next's image optimizer writes its cache to
# <distDir>/cache/images (i.e. /app/.next/cache/images) and, when that mkdir/write fails, it
# logs "Failed to write image to cache" and serves the response anyway. There is no in-memory
# fallback for a self-hosted standalone server. The result was a permanently cold cache: EVERY
# /_next/image request re-fetched the upstream file and re-ran a full sharp transcode, for every
# optimized image on the site — product grids included, not just the hero.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Must come AFTER the COPYs: `COPY ... /app/.next/standalone ./` recreates /app/.next and would
# otherwise reset ownership. Pre-creating the dir also lets a mounted named volume inherit the
# correct ownership on first creation.
RUN mkdir -p /app/.next/cache/images && chown -R nextjs:nodejs /app/.next

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
