# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

No test suite is configured.

## Architecture Overview

Multi-tenant digital menu & ordering SaaS built with Next.js 15 App Router + Supabase.

### Data model (key tables)
- `restaurants` — top-level tenant, has a `slug` for public URL
- `locations` — physical branches of a restaurant (each has its own panel)
- `categories` → `products` — menu structure, scoped to `restaurant_id`
- `extra_groups` → `extra_options` — modifiers; linked to categories/products via `category_extra_groups` / `product_extra_groups` pivot tables
- `orders` → `order_items` → `order_item_extras` — order hierarchy, scoped to `location_id`

### Route map
| Path | Purpose |
|------|---------|
| `/[slug]` | Public menu (customer-facing) |
| `/pedido/[id]` | Customer order tracking |
| `/panel/[locationId]` | Employee kitchen panel (PIN-protected, no Supabase auth required) |
| `/(admin)/admin/...` | Admin dashboard (requires Supabase auth) |
| `/api/panel/verify` | Validates employee PIN |
| `/api/orders` | Creates orders from public menu |
| `/api/import/menu` | OpenAI-assisted menu import |

### Auth & middleware
- `middleware.ts` runs on every non-static request; uses `@supabase/ssr` cookie-based sessions
- `/admin/*` requires authenticated session; `/superadmin/*` additionally requires `superadmin` role
- The employee `/panel/[locationId]` is **not** protected by middleware — it uses a PIN check via `/api/panel/verify`

### Supabase clients
- `lib/supabase/server.ts` — for Server Components and API routes
- `lib/supabase/client.ts` — for Client Components; also used for Realtime subscriptions

### Realtime
`OrdersBoard` (admin) and `PanelBoard` (employee) both subscribe to `postgres_changes` on the `orders` table, filtered by `location_id`. New INSERT events are deduplicated before adding to state (check `p.some(o => o.id === data.id)`).

### Shared order-editing logic
`components/orders/AddItemsToOrderModal.tsx` is the central module for all cart/extras UI. It exports:
- Types: `ExtraOption`, `ExtraGroup`, `SimpleProduct`, `SimpleCategory`, `ProductWithExtras`, `SelectedExtra`, `CartEntry`
- Helpers: `buildProductsWithExtras`, `addToCart`, `setCartEntryQty`, `cartTotal`
- Components: `ProductBrowser`, `ExtrasStep`
- Hook: `useExtrasState`

These are imported by `OrdersBoard` (admin new-order modal) and `CreateOrderModal` (employee create-order flow). Do not duplicate this logic.

### Cart deduplication
`cartKey = \`${productId}_${sortedOptionIds.join('_')}\`` — same product + same extras increments quantity; same product + different extras creates a new entry.

### Hydration pitfalls
Never read `localStorage` inside `useState()` initializers — this causes server/client mismatch. Always initialize to a safe default and read localStorage in a `useEffect`.

## Key component responsibilities

| Component | Role |
|-----------|------|
| `OrdersBoard` | Admin orders view — list/kanban, new order, edit order, realtime |
| `PanelBoard` | Employee panel — PIN screen, same list/kanban UI as admin, create order, back-step status, print comanda, sound notifications |
| `AddItemsToOrderModal` | Edit existing order items + shared cart/extras logic (see above) |
| `CreateOrderModal` | Employee create-new-order modal (multi-step: cart → extras → info) |
| `PaymentMethodModal` | Reusable modal for selecting/changing payment method |
| `VentasBoard` | Admin sales/revenue dashboard |
| `MenuPublic` | Customer-facing menu with cart and checkout |

## Tailwind CSS v4
This project uses Tailwind v4 (PostCSS plugin). There is no `tailwind.config.js` — configuration is done in `globals.css` via `@theme`. Use standard utility classes; no `tailwind.config.js` to edit.
