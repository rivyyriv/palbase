# Use Node.js with Puppeteer support
FROM ghcr.io/puppeteer/puppeteer:21.6.0

# Set working directory
WORKDIR /app

# Switch to root to install dependencies
USER root

# Copy package files from root and scraper
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

# Build shared package first
RUN pnpm --filter @palbase/shared build

# Build scraper
RUN pnpm --filter @palbase/scraper build

# Switch back to non-root user for security
USER pptruser

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Expose port
EXPOSE 4000

# Start the scraper
CMD ["node", "packages/scraper/dist/index.js"]
