# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This is a luxury fashion e-commerce store called **MAISON NOIR** — a Marc Jacobs-inspired, avant-garde editorial fashion brand.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── fashion-store/      # React + Vite luxury fashion e-commerce frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Fashion Store Features

### Frontend (`artifacts/fashion-store`)
- **Animated Intro Sequence**: Editorial product flash reel → brand name stamp → "ENTER" CTA
- **Glitch Effects**: Film grain overlay (24fps canvas), CSS glitch text (red/cyan), scan line sweep
- **Design**: Pure white/jet black, no rounded corners, Playfair Display + Inter, brutalist grid
- **Pages**: Landing/Intro, Storefront, Category pages, Product detail, Order confirmation, 404
- **Cart**: Zustand-powered slide-in cart drawer
- **Checkout**: Stripe Checkout sessions

### Backend (`artifacts/api-server`)
- **Products API**: GET /api/products, /api/products/:id, /api/products/category/:slug
- **Checkout**: POST /api/checkout/session (Stripe Checkout)
- **Webhooks**: POST /api/webhook (Stripe → Printful order fulfillment)
- **Orders**: GET /api/orders/:sessionId

### Database Schema
- **products**: Caches Printful product data with 60-minute TTL
- **orders**: Tracks Stripe sessions, Printful order IDs, fulfillment status

## Environment Variables Required
- `DATABASE_URL` — auto-provisioned by Replit
- `SESSION_SECRET` — already configured
- `STRIPE_SECRET_KEY` — required for live payments
- `STRIPE_PUBLISHABLE_KEY` — required for live payments
- `STRIPE_WEBHOOK_SECRET` — required for webhook verification
- `PRINTFUL_API_KEY` — required for live product sync + fulfillment

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/fashion-store` (`@workspace/fashion-store`)

React + Vite luxury fashion e-commerce frontend. Uses wouter for routing, framer-motion for animations, zustand for cart state, @tanstack/react-query for data fetching.

- Entry: `src/main.tsx`
- App setup: `src/App.tsx` — routes with wouter, QueryClient, CartDrawer
- Pages: Landing, Home, Category, ProductDetail, OrderConfirmation, not-found
- Components: Navigation, CartDrawer, FilmGrain, GlitchText, ProductCard, Layout, Footer
- Hooks: use-cart (zustand), use-toast
- Styles: `src/index.css` — Google Fonts, Tailwind, glitch animations, scan line

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express, seeds sample products
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: health, products, checkout, webhook, orders
- Libs: printfulService (Printful API + product cache + seeding)
- Depends on: `@workspace/db`, `@workspace/api-zod`, stripe

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- Schema: `products` table (Printful product cache), `orders` table (Stripe + Printful orders)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
