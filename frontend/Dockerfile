# syntax=docker/dockerfile:1
# Production: build then run node server.js (do NOT use next dev on server)
FROM node:20-alpine AS base
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
RUN npx next build

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
