# syntax=docker/dockerfile:1

# ---- Build: install all dependencies, build the web app and bundle the server ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/templates/package.json packages/templates/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Runtime: Playwright's image ships Node and a matching Chromium for PDF export ----
# The tag must match the "playwright" version in apps/server/package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS runtime
# Metric-compatible fonts so resumes render with the same line breaks as Calibri/Cambria.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-crosextra-carlito fonts-crosextra-caladea fonts-liberation fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PORT=3000 \
    WEB_DIST_DIR=/app/apps/web/dist \
    MIGRATIONS_DIR=/app/apps/server/drizzle
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/templates/package.json packages/templates/
RUN npm ci --omit=dev --workspace @folioforge/server --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/server/drizzle apps/server/drizzle
COPY --from=build /app/apps/web/dist apps/web/dist
USER pwuser
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/server/dist/index.js"]
