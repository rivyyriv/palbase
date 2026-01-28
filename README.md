# Palbase - Pet Adoption Aggregator

A monolithic platform that aggregates pet adoption listings from multiple sources across the US.

## Project Structure

```
palbase/
├── packages/
│   ├── shared/     # Shared types, utils, Supabase client
│   ├── scraper/    # Node.js scraping service
│   ├── web/        # Next.js public website
│   ├── admin/      # Next.js admin dashboard
│   └── mobile/     # Expo React Native app
├── supabase/
│   └── migrations/ # Database migrations
└── package.json    # Monorepo root
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Redis (for job queue)
- Supabase project

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values
```

### Development

```bash
# Run all packages in development
pnpm dev

# Or run individual packages
pnpm web:dev      # Web app on port 3000
pnpm admin:dev    # Admin dashboard on port 3001
pnpm mobile:start # Expo mobile app
pnpm scraper:dev  # Scraper service
```

### Build

```bash
# Build all packages
pnpm build
```

## Data Sources

- Petfinder.com
- Adopt-a-Pet.com
- ASPCA.org
- BestFriends.org
- PetSmartCharities.org

## License

Private
