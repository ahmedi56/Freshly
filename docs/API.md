# Freshly — API Design

Base URL (dev): `http://localhost:4000/api/v1`

All request/response bodies are JSON. All authenticated requests send
`Authorization: Bearer <accessToken>`.

## 1. Response envelope

Success:
```json
{ "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }
```
`meta` only present on paginated list endpoints.

Error (global exception filter):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "email must be a valid email address",
  "path": "/api/v1/auth/register",
  "timestamp": "2026-08-17T10:00:00.000Z"
}
```

## 2. Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create CUSTOMER account (role fixed server-side) |
| POST | `/auth/cleaners/apply` | Public | Create CLEANER user + CleanerApplication in one step |
| POST | `/auth/login` | Public | Returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | Public (refresh token in body) | Rotates refresh token, returns new pair |
| POST | `/auth/logout` | Bearer | Revokes the given refresh token |
| POST | `/auth/logout-all` | Bearer | Revokes all refresh tokens for the user |
| POST | `/auth/password-reset/request` | Public | Issues reset token, sends via NotificationService (email) |
| POST | `/auth/password-reset/confirm` | Public | Consumes token, sets new password |
| POST | `/auth/email/verify/request` | Bearer | Sends verification email |
| POST | `/auth/email/verify/confirm` | Public (token in body) | Marks `emailVerifiedAt` |
| GET | `/auth/me` | Bearer | Current user + role-specific profile |

`ADMIN` accounts are never self-registrable — created via seed script or by
an existing ADMIN through `/admin/users`.

## 3. Services & catalog (read: public, write: ADMIN)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/services/categories` | Public | List active categories |
| GET | `/services` | Public | List active services (filter by categoryId) |
| GET | `/services/:id` | Public | Service detail incl. extras + pricing rules |
| POST | `/services` | ADMIN | Create service |
| PATCH | `/services/:id` | ADMIN | Update service |
| GET | `/services/extras` | Public | List extras |
| POST | `/services/extras` | ADMIN | Create extra |
| POST | `/services/pricing-rules` | ADMIN | Add a ServicePricing rule |

## 4. Pricing (the authoritative calculator — Rule: pricing not hardcoded in frontend)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/pricing/quote` | Bearer (CUSTOMER) | Input: serviceId, rooms, propertySizeSqm, extraIds[], promotionCode?. Output: full breakdown (subtotal, extrasTotal, discountTotal, vatTotal, total) — same calculation used at checkout. |

Request:
```json
{
  "serviceId": "svc_home_cleaning",
  "rooms": 3,
  "propertySizeSqm": 120,
  "extraIds": ["extra_windows", "extra_oven", "extra_fridge"],
  "promotionCode": "WELCOME50"
}
```
Response:
```json
{
  "data": {
    "subtotal": "650.00",
    "extrasTotal": "120.00",
    "discountTotal": "-50.00",
    "vatTotal": "108.00",
    "total": "828.00",
    "servicePricingId": "sp_123",
    "currency": "ZAR"
  }
}
```

## 5. Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings/draft` | CUSTOMER | Create/update an in-progress draft (persists wizard state server-side) |
| GET | `/bookings/draft/:id` | CUSTOMER (owner) | Resume a draft |
| POST | `/bookings/:id/checkout` | CUSTOMER (owner) | Finalizes pricing via PricingService, creates Payment (status PENDING), transitions booking to PENDING_PAYMENT |
| GET | `/bookings` | CUSTOMER / CLEANER / ADMIN | List — scoped automatically by role (customer sees own, cleaner sees assigned, admin sees all; filters: status, date range) |
| GET | `/bookings/:id` | Owner-scoped | Full detail incl. items, statusHistory, current assignment |
| PATCH | `/bookings/:id/cancel` | CUSTOMER (owner) / ADMIN | Transitions to CANCELLED (only from cancellable states) |
| POST | `/bookings/:id/assign` | ADMIN | Creates CleanerAssignment (OFFERED), transitions booking to CLEANER_ASSIGNED |
| POST | `/bookings/:id/assignment/accept` | CLEANER (assignee) | AssignmentStatus → ACCEPTED, booking → CLEANER_ACCEPTED |
| POST | `/bookings/:id/assignment/decline` | CLEANER (assignee) | AssignmentStatus → DECLINED, booking reverts to CONFIRMED (awaiting re-assignment) |
| POST | `/bookings/:id/status/on-the-way` | CLEANER (assignee) | → ON_THE_WAY |
| POST | `/bookings/:id/status/arrived` | CLEANER (assignee) | → ARRIVED |
| POST | `/bookings/:id/status/start` | CLEANER (assignee) | → CLEANING_STARTED |
| POST | `/bookings/:id/status/complete` | CLEANER (assignee) | → COMPLETED, triggers review-request notification + cleaner earnings update |

Every one of the above status endpoints goes through the same
`BookingStateMachine.transition()` call — invalid transitions return `409
Conflict` with the allowed next-states listed. See `WORKFLOW.md`.

## 6. Cleaner application & profile

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/cleaners/applications/:id/documents` | CLEANER (owner) | Multipart upload → StorageService, creates CleanerDocument |
| POST | `/cleaners/applications/:id/references` | CLEANER (owner) | Add reference |
| GET | `/cleaners/applications/:id` | CLEANER (owner) / ADMIN | Application detail |
| GET | `/admin/cleaner-applications` | ADMIN | List, filterable by status |
| POST | `/admin/cleaner-applications/:id/approve` | ADMIN | → APPROVED |
| POST | `/admin/cleaner-applications/:id/reject` | ADMIN | → REJECTED, requires reason |
| GET | `/cleaners/:id/availability` | Public | Read availability |
| PUT | `/cleaners/me/availability` | CLEANER | Replace own availability slots |
| GET | `/cleaners/me/earnings` | CLEANER | Aggregated earnings (from completed bookings) |
| GET | `/cleaners/me/jobs` | CLEANER | Own assigned bookings |

## 7. Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/:id/process` | CUSTOMER (owner) | Invokes the selected PaymentProvider; sandbox in dev |
| POST | `/payments/webhook/:provider` | Public (signature-verified) | Provider callback → PaymentTransaction + Payment status update → cascades Booking to PAID/CONFIRMED |
| GET | `/payments/:id` | Owner-scoped | Payment detail with transaction history |

## 8. Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings/:id/review` | CUSTOMER (owner) | Only when booking.status = COMPLETED and no existing review |
| GET | `/cleaners/:id/reviews` | Public | Paginated |
| POST | `/reviews/:id/reply` | CLEANER (the reviewed cleaner) | Adds cleanerReply |

## 9. Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/dashboard/summary` | ADMIN | Revenue, bookings count, active cleaners, pending applications (cards on the dashboard) |
| GET | `/admin/dashboard/revenue-series` | ADMIN | Time series for chart |
| GET | `/admin/dashboard/top-services` | ADMIN | Breakdown for pie chart |
| GET | `/admin/customers` | ADMIN | List/search |
| GET | `/admin/cleaners` | ADMIN | List/search |
| POST | `/admin/cleaners/:id/suspend` | ADMIN | Suspend cleaner |
| GET | `/admin/bookings` | ADMIN | Full list with filters |
| POST | `/admin/bookings/:id/cancel` | ADMIN | Force cancel |
| GET | `/admin/payments` | ADMIN | List |
| POST | `/admin/promotions` | ADMIN | CRUD |
| POST | `/admin/notifications/broadcast` | ADMIN | Send notification to a user segment |

## 10. Notifications, favorites, loyalty, referrals — customer-facing

| Method | Path | Auth |
|---|---|---|
| GET/PATCH `/notifications`, `/notifications/:id/read` | Bearer |
| GET/POST/DELETE `/favorites` | CUSTOMER |
| GET `/loyalty/me` | CUSTOMER |
| GET/POST `/referrals` | CUSTOMER |
| GET `/promotions/validate?code=` | Bearer |

## 11. WebSocket events (Socket.IO namespace `/realtime`)

Client joins room `booking:{id}` after authenticating the socket with the
same JWT. Server emits:
- `booking.status_changed` — `{ bookingId, fromStatus, toStatus, at }`
- `notification.created` — pushed to `user:{id}` room

## 12. Rate limiting & security

- Global rate limit via `@nestjs/throttler` (e.g. 100 req/min/IP), stricter on
  `/auth/*`.
- `helmet` middleware, CORS restricted to known frontend origins via env var.
- All list endpoints paginated (`page`, `pageSize`, max 100).
