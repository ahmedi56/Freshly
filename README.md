# Freshly

Cleaning-services marketplace. A single Express API on SQLite powers two
clients: a Next.js web app (customer + admin) and an Expo mobile app
(cleaners).

```
                    ┌──────────────────────────┐
                    │  Express API (backend/)   │
                    │  REST + JWT + roles       │
                    └──────┬───────────┬────────┘
              ┌────────────┘           └─────────────┐
     ┌────────▼─────────┐                 ┌──────────▼──────────┐
     │ customer-web     │                 │ cleaner-mobile      │
     │ Next.js          │                 │ Expo (React Native) │
     │ customer + admin │                 │ cleaners only       │
     └──────────────────┘                 └─────────────────────┘
```

## Stack

- **Backend** — `backend/`: Express 4, better-sqlite3, JWT (httpOnly cookies
  + rotating refresh tokens), CSRF double-submit, helmet, rate limiting,
  zod validation, bcrypt (cost 12). Port 3001.
- **Web** — `apps/customer-web`: Next.js 16 (App Router), React Query,
  lucide icons, responsive (mobile bottom-nav + desktop sidebar).
- **Mobile** — `apps/cleaner-mobile`: Expo (React Native), React Query,
  tokens stored in the OS keychain via `expo-secure-store`.
- **Shared** — `packages/shared-types`: wire contract used by both clients.

## Getting started

Prerequisites: Node 20+, npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure the backend — required, server refuses to boot without it
cp backend/.env.example backend/.env    # (or edit backend/.env)
# generate JWT_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Configure the clients
cp .env.example apps/customer-web/.env.local
cp .env.example apps/cleaner-mobile/.env

# 4. Run everything
npm run dev:api      # Express API -> http://localhost:3001
npm run dev:web      # Next.js    -> http://localhost:3000
npm run dev:mobile   # Expo       -> QR code in terminal
```

The API schema is created and demo data seeded automatically on first boot
(see `backend/src/db/seed.js`).

## Demo accounts (password: `password123`)

| Role | Email |
| ---- | ----- |
| Admin | admin@freshly.co.za |
| Customer | thabo@example.co.za / sarah@example.co.za / priya@example.co.za |
| Cleaner | nomvula@example.co.za / johannes@example.co.za / lindiwe@example.co.za / pieter@example.co.za |
| Pending cleaner | grace@example.co.za |

## Verify it works

```bash
curl http://localhost:3001/api/health
# -> {"ok":true,...}

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thabo@example.co.za","password":"password123"}'
# -> 200, sets httpOnly cookies (tokens only in body with `x-client: native`)
```

## Auth model

- Access token: short-lived (15 min), httpOnly cookie on web / keychain on
  mobile. Refresh token: 30 days, rotated on every refresh, stored hashed in
  DB and revocable on logout.
- CSRF: web mutating requests require an `x-csrf-token` header matching the
  `freshly_csrf` cookie. Native clients use `x-client: native` and get tokens
  in the response body instead of cookies.
- Roles: `customer`, `cleaner`, `admin`, enforced server-side per route
  (`requireAuth` / `requireRole`).

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev:api` | Start Express API |
| `npm run seed:api` | Re-seed (only seeds an empty DB) |
| `npm run dev:web` / `build:web` / `lint:web` | Next.js dev / build / lint |
| `npm run dev:mobile` | Expo dev server |