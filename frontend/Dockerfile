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
# Build args for API URLs (used by GitHub Actions; .env overrides when building locally)
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

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
