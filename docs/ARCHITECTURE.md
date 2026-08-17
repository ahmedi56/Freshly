# Freshly — Architecture

## 1. Overview

Freshly is a multi-sided marketplace connecting customers with vetted cleaning
professionals. Three client applications share one backend API and one
relational database.

```
                        ┌─────────────────────┐
                        │   MySQL (Prisma)     │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   API (NestJS)        │
                        │   REST + JWT + RBAC   │
                        │   WebSocket gateway   │
                        └──┬──────────┬─────────┘
                 ┌─────────┘          └─────────┐
        ┌────────▼────────┐          ┌──────────▼────────┐
        │ customer-web     │          │ admin-web          │
        │ (Next.js)        │          │ (Next.js)           │
        └──────────────────┘          └────────────────────┘
                 │
        ┌────────▼────────┐
        │ cleaner-mobile   │
        │ (Expo / RN)      │
        └──────────────────┘
```

All three frontends are pure API consumers. No frontend holds authoritative
business data in local state beyond what's needed for optimistic UI — the
database is the single source of truth.

## 2. Monorepo layout

```
freshly/
  apps/
    customer-web/     Next.js (App Router) — public site + customer dashboard
    cleaner-mobile/   Expo React Native — cleaner-facing app
    admin-web/        Next.js — internal admin dashboard
    api/              NestJS — REST API, auth, business logic, websockets
  packages/
    shared-types/     TypeScript types/DTOs shared across all apps
    ui/                Shared design-system components (web only; RN has its own)
    config/            Shared eslint/tsconfig/tailwind config
  database/
    prisma/            schema.prisma, migrations, seed.ts
  docs/                 This documentation set
```

Package manager: npm workspaces (or pnpm — recommended for faster installs;
either works with this layout). Each app has its own `package.json` and
depends on `@freshly/shared-types` via workspace protocol.

## 3. Backend architecture (NestJS)

### Module boundaries

```
api/src/
  auth/              registration, login, refresh, guards, strategies
  users/             User CRUD, role management
  customers/         CustomerProfile, addresses, favorites
  cleaners/          CleanerProfile, applications, documents, availability
  services/          ServiceCategory, Service, ServiceExtra, ServicePricing
  bookings/          Booking, BookingItem, BookingStatusHistory, state machine
  assignment/         CleanerAssignment logic (manual now, pluggable auto-match later)
  pricing/            PricingService — single source of truth for price calc
  payments/           PaymentProvider abstraction + Sandbox provider
  notifications/      NotificationService — email/push/in-app fan-out
  reviews/            Review CRUD, rating aggregation
  loyalty/            LoyaltyAccount, LoyaltyTransaction
  referrals/          Referral tracking
  promotions/         Promotion CRUD + application to bookings
  admin/               Admin-only aggregation endpoints (revenue, stats)
  realtime/            Socket.IO gateway, room-per-booking
  common/              Guards, decorators, filters, interceptors, pipes
  storage/             Storage abstraction (local disk in dev, S3-compatible in prod)
  maps/                 Maps provider abstraction (Google Maps / Mapbox pluggable)
  prisma/               PrismaService (singleton PrismaClient wrapper)
```

Each domain module exposes:
- `*.controller.ts` — HTTP routes, guarded by `@Roles()` decorator
- `*.service.ts` — business logic, the only layer allowed to talk to Prisma
- `dto/` — class-validator DTOs for request validation
- `*.spec.ts` — unit/integration tests

### Cross-cutting concerns

- **Validation**: global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
- **Error handling**: global `HttpExceptionFilter` normalizes error responses to
  `{ statusCode, message, error, timestamp, path }`.
- **Logging**: request logging interceptor + structured logger (pino or Nest's
  built-in Logger, upgradeable to a log shipper in production).
- **Auth guards**: `JwtAuthGuard` (is the requester authenticated) +
  `RolesGuard` (does the requester's role satisfy `@Roles(...)`) applied
  globally, with `@Public()` opt-out decorator for open routes.
- **Ownership guards**: resource-level guards (e.g. `BookingOwnerGuard`) ensure
  a CUSTOMER can only read/write their own bookings, and a CLEANER can only
  read/write bookings assigned to them. This is enforced server-side — the
  frontend hiding a button is not a security boundary.

### Real-time layer

A Socket.IO gateway (`realtime/booking.gateway.ts`) exposes rooms keyed by
`booking:{id}`. Clients join the room for bookings they're authorized to view
(same ownership check as REST). Whenever `BookingsService` transitions a
booking's status, it emits `booking.status_changed` into that room. This
decouples status broadcast from HTTP polling.

## 4. Frontend architecture

### customer-web (Next.js)
- App Router, server components for public marketing pages (SEO), client
  components + React Query for authenticated dashboard views.
- React Query owns all server-state caching; no booking/pricing data is held
  in global client state (e.g. Redux) — it's fetched and cached per-query-key
  and invalidated on mutation.
- Booking flow (7-step wizard) keeps in-progress selections in a single
  client-side reducer that is persisted to the backend as a **draft booking**
  on each step change (Rule 5 — no important business data lives only in
  React state). If the user abandons the flow, the draft is resumable.

### cleaner-mobile (Expo)
- Same API, same auth (JWT stored in `expo-secure-store`).
- React Query for data fetching, mirrors customer-web patterns.
- Push notifications via Expo push service, triggered by the backend
  notification service.

### admin-web (Next.js)
- Desktop-first, tablet-compatible.
- All mutating actions (approve cleaner, assign cleaner, cancel booking, etc.)
  go through the same guarded API endpoints as the other apps — admin has no
  private backdoor; it has ADMIN-role JWTs.

## 5. Authentication & authorization

See `API.md` for endpoint-level detail. Summary:
- Passwords hashed with bcrypt (cost factor 12).
- JWT access token (short-lived, 15 min) + refresh token (long-lived, 7–30
  days, rotated on use, stored hashed in DB in `RefreshToken` table for
  revocation support).
- `Role` enum: `CUSTOMER`, `CLEANER`, `ADMIN`. A `User` has exactly one role.
- Route protection: `@Roles(Role.ADMIN)` on controller/handler + global
  `RolesGuard`. Ownership protection: dedicated guards per resource type.

## 6. Booking state machine

Implemented as an explicit, enumerated transition table in
`bookings/booking-state-machine.ts` — not ad-hoc `if` statements scattered
through the service. See `WORKFLOW.md` for the full transition diagram.
Every transition is validated against the allowed-transitions map before the
`Booking.status` column is written, and every write also inserts a
`BookingStatusHistory` row (append-only audit trail).

## 7. Pricing engine

`PricingService.calculate(input)` is the **only** place a price is computed.
Both the booking-draft preview endpoint and the final checkout endpoint call
this same service, so what the customer previews is guaranteed to match what
they're charged. See `API.md` §Pricing for the request/response contract.

## 8. Payments

`PaymentProvider` interface with two implementations:
- `SandboxPaymentProvider` (default in dev — simulates async processing with
  configurable delay/outcome, same interface as production)
- `CardPaymentProvider`, `OzowPaymentProvider` (real implementations, enabled
  via environment variables when credentials are available)

No raw card data ever touches the Freshly backend — card provider integration
is tokenization-based (provider-hosted fields / redirect), consistent with
PCI-DSS SAQ-A scope reduction.

## 9. Storage

`StorageService` abstraction with a `LocalDiskStorageProvider` (dev) and
`S3StorageProvider` (prod), selected via `STORAGE_DRIVER` env var. Used for
cleaner application documents and profile photos.

## 10. Deployment target

- API: containerized (Dockerfile provided later), deployable to
  Railway/Render/AWS ECS.
- MySQL: managed instance (PlanetScale/RDS/Railway MySQL).
- customer-web / admin-web: Vercel or same container host.
- cleaner-mobile: Expo EAS Build → App Store / Play Store.
- File storage: S3-compatible bucket in production.

## 11. What's real vs. stubbed at this stage

Per Rule 2/9: everything is wired end-to-end. Where a feature depends on an
external paid credential we don't have yet (payment gateway, maps provider,
push notification certs), the abstraction is fully implemented and a
sandbox/test implementation is wired in behind the same interface — never a
fake button.
