# Dockerfile for Palbase Scraper - deploy from repo root
FROM ghcr.io/puppeteer/puppeteer:21.6.0

WORKDIR /app

USER root

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/shared/package.json ./packages/shared/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/scraper ./packages/scraper
COPY tsconfig.json ./

# Build shared package
RUN pnpm --filter @palbase/shared build

# Build scraper
RUN pnpm --filter @palbase/scraper build

USER pptruser

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Railway sets PORT dynamically
EXPOSE ${PORT:-4000}

CMD ["node", "packages/scraper/dist/index.js"]
