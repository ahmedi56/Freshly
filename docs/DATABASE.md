# Freshly — Database Design

Engine: MySQL 8. ORM: Prisma. Full schema lives in
`database/prisma/schema.prisma`. This document explains the design
decisions; read it alongside the schema.

## 1. Design principles

- Every table has a surrogate primary key: `id String @id @default(cuid())`.
  CUIDs are used instead of auto-increment ints so IDs are safe to expose in
  URLs/APIs without leaking sequence/volume information, and so client-side
  draft records (e.g. an in-progress booking) can generate a stable ID before
  the first server round-trip if ever needed.
- Every table has `createdAt` / `updatedAt` timestamps.
- Status fields are Prisma `enum`s, not free-text strings — invalid states are
  impossible at the schema level.
- Money is stored as `Decimal(10,2)` (via Prisma `Decimal`), never `Float`,
  to avoid floating-point rounding errors in financial data.
- History/audit tables (`BookingStatusHistory`, `AuditLog`,
  `LoyaltyTransaction`, `PaymentTransaction`) are **append-only** — the
  application layer never `UPDATE`s or `DELETE`s rows in these tables.
- Foreign keys use `onDelete: Restrict` by default for anything financial or
  historical (you cannot delete a User who has Bookings), and `Cascade` only
  for genuinely dependent child data (deleting a Booking cascades its
  BookingItems).

## 2. Entity groups

### 2.1 Identity
- **User** — email, passwordHash, role (`CUSTOMER | CLEANER | ADMIN`),
  emailVerifiedAt, status (active/suspended). One row per human, regardless
  of role — this is the row JWTs are issued against.
- **RefreshToken** — hashed refresh tokens, one-to-many from User, supports
  revocation (logout, "log out all devices").
- **CustomerProfile** — 1:1 with User where role = CUSTOMER. First/last name,
  phone, preferences.
- **CleanerProfile** — 1:1 with User where role = CLEANER. Bio, rating
  aggregate, verification status, bank details reference (tokenized, not raw).

### 2.2 Cleaner onboarding
- **CleanerApplication** — the application record itself; status
  (`PENDING | UNDER_REVIEW | APPROVED | REJECTED | SUSPENDED`), reviewedBy
  (User FK, nullable), reviewedAt, rejectionReason.
- **CleanerDocument** — polymorphic-ish via `type` enum (ID_DOCUMENT,
  PROOF_OF_ADDRESS, POLICE_CLEARANCE, PROFILE_PHOTO, OTHER), stores a
  `storageKey` (not a raw URL) resolved through the Storage abstraction.
- **CleanerReference** — name, relationship, phone, contacted boolean.
- A CleanerProfile cannot be assigned bookings while its linked
  CleanerApplication.status != APPROVED — enforced in the assignment service,
  not just hidden in UI (Rule 7).

### 2.3 Catalog
- **ServiceCategory** — Home Cleaning, Office Cleaning, etc.
- **Service** — belongs to a category; name, description, basePrice,
  estimatedDurationMinutes, active flag.
- **ServiceExtra** — add-ons (Windows, Oven, Fridge...) with their own price;
  many-to-many to Service via `ServiceExtraOnService` join table (an extra
  like "Windows" can apply to multiple services).
- **ServicePricing** — versioned pricing rules per service (e.g. price
  multipliers by property size/room count). Kept separate from `Service` so
  price history is preserved even as rules change — bookings reference the
  ServicePricing version that was active at booking time.

### 2.4 Location
- **Address** — belongs to CustomerProfile; line1/2, city, province,
  postalCode, lat/lng (nullable until geocoded), label (Home/Work/Other),
  isDefault.
- **CleanerAvailability** — belongs to CleanerProfile; dayOfWeek + start/end
  time recurring slots (simple recurring-availability model; can be extended
  to date-specific overrides later).

### 2.5 Booking core
- **Booking** — the aggregate root. customerId, addressId, serviceId,
  scheduledAt, status enum (see WORKFLOW.md for full list), pricing snapshot
  columns (subtotal, extrasTotal, discountTotal, vatTotal, total — all
  computed once by PricingService and frozen at booking creation, never
  recalculated from live prices later), notes, propertySize/rooms.
- **BookingItem** — line items: one row for the base service, one row per
  selected extra, each with its own price snapshot. This is what lets a
  receipt/invoice be reconstructed exactly as charged even if the underlying
  Service/ServiceExtra price changes later.
- **BookingStatusHistory** — append-only: bookingId, fromStatus, toStatus,
  changedBy (User FK, nullable for system-triggered transitions), note,
  createdAt. This is Rule 7's audit trail — status is never silently
  overwritten.
- **CleanerAssignment** — bookingId, cleanerId, assignedBy (admin User FK,
  nullable for future auto-assignment), status
  (`OFFERED | ACCEPTED | DECLINED | REVOKED`), respondedAt. A Booking can have
  multiple CleanerAssignment rows over time (if a cleaner declines and
  another is offered) — the *current* assignment is the latest ACCEPTED (or
  latest OFFERED if none accepted yet) row, not a column on Booking itself.

### 2.6 Payments
- **Payment** — bookingId (1:1), provider enum (`SANDBOX | CARD | OZOW`),
  status enum (`PENDING | PROCESSING | SUCCESS | FAILED | CANCELLED |
  REFUNDED`), amount, currency.
- **PaymentTransaction** — append-only log of every state change /
  provider webhook event for a Payment (mirrors BookingStatusHistory's
  pattern). Never store raw card PAN/CVV — only a provider token reference.

### 2.7 Post-service
- **Review** — bookingId (1:1, only creatable once Booking.status =
  COMPLETED), customerId, cleanerId, rating (1–5), comment, cleanerReply
  (nullable). On create, a database transaction also recalculates and writes
  `CleanerProfile.ratingAverage` / `ratingCount` — this aggregate is
  denormalized for read performance but always derived from Review rows, so
  it's a cache, not a second source of truth.
- **FavoriteCleaner** — customerId + cleanerId unique pair.

### 2.8 Growth features
- **Notification** — userId, type enum, title, body, readAt (nullable),
  relatedBookingId (nullable). In-app notifications are rows here; email/push
  delivery is fire-and-forget side effects triggered off the same event, not
  separate source-of-truth tables.
- **LoyaltyAccount** — 1:1 with CustomerProfile, pointsBalance (denormalized,
  derived from LoyaltyTransaction sum).
- **LoyaltyTransaction** — append-only: earn/redeem events, amount, reason,
  relatedBookingId.
- **Referral** — referrerId (CustomerProfile), refereeId (nullable until
  claimed), code, status (`PENDING | CLAIMED | REWARDED`).
- **Promotion** — code, type (`PERCENTAGE | FIXED_AMOUNT`), value,
  validFrom/validTo, usageLimit, usageCount, active. Applied to a Booking via
  a `promotionId` FK on Booking (nullable) — the discount amount is still
  frozen into `Booking.discountTotal` at booking time.

### 2.9 Platform
- **AuditLog** — append-only, generic: actorId (User, nullable for system),
  action (string), entityType, entityId, metadata (JSON), createdAt. Used for
  admin actions (approve cleaner, cancel booking, issue refund) so there's a
  forensic trail independent of domain-specific history tables.

## 3. Indexing strategy

- All foreign key columns are indexed (Prisma does this by default for
  relation scalar fields).
- `User.email` — unique index (login lookup).
- `Booking.customerId, status` — composite index (customer dashboard "my
  bookings" filtered by status).
- `Booking.status, scheduledAt` — composite index (admin dashboard "active
  bookings today" queries).
- `CleanerAssignment.cleanerId, status` — composite index (cleaner "my jobs").
- `Review.cleanerId` — index (rating aggregation queries).
- `Notification.userId, readAt` — composite index (unread-count queries).
- `Promotion.code` — unique index.
- `Referral.code` — unique index.

## 4. Migrations & seeding

- `prisma migrate dev` for local iterative migrations.
- `prisma migrate deploy` for production (no interactive prompts).
- `database/prisma/seed.ts` populates demo data (see SEED section in
  API.md) — reads demo credentials from environment variables, never
  hardcodes secrets.
