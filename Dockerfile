# Dockerfile for Palbase Scraper - optimized for faster builds
FROM ghcr.io/puppeteer/puppeteer:21.6.0

WORKDIR /app
USER root

# Install pnpm globally first
RUN npm install -g pnpm

# Copy only essential package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies without lockfile for speed
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/scraper ./packages/scraper
COPY tsconfig.json ./

# Build both packages in one step
RUN pnpm --filter @palbase/shared build && pnpm --filter @palbase/scraper build

USER pptruser

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD ["node", "packages/scraper/dist/index.js"]
