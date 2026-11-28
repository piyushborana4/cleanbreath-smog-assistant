# Multi-stage production Dockerfile for Google Cloud Run
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --legacy-peer-deps

COPY tsconfig.json vite.config.ts index.html metadata.json server.ts ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Run as non-root user for least-privilege container execution
RUN addgroup -g 1001 -S nodejs && adduser -S cleanbreath -u 1001 -G nodejs \
  && chown -R cleanbreath:nodejs /app
USER cleanbreath

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "dist-server/server.js"]
