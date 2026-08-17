# Freshly — Booking Workflow & State Machine

## 1. Full status list

```
DRAFT            — wizard in progress, not yet submitted
PENDING_PAYMENT  — submitted, awaiting payment result
PAID             — payment succeeded
CONFIRMED        — booking confirmed, awaiting cleaner assignment
CLEANER_ASSIGNED — admin has offered the job to a cleaner
CLEANER_ACCEPTED — cleaner accepted
ON_THE_WAY       — cleaner started travel
ARRIVED          — cleaner arrived at property
CLEANING_STARTED — cleaning in progress
COMPLETED        — cleaning finished
CANCELLED        — cancelled (by customer or admin)
REJECTED         — rejected (e.g. payment failed permanently, or admin rejects)
```

## 2. Allowed transitions

```
DRAFT            → PENDING_PAYMENT, CANCELLED
PENDING_PAYMENT  → PAID, REJECTED, CANCELLED
PAID             → CONFIRMED
CONFIRMED        → CLEANER_ASSIGNED, CANCELLED
CLEANER_ASSIGNED → CLEANER_ACCEPTED, CONFIRMED (on decline), CANCELLED
CLEANER_ACCEPTED → ON_THE_WAY, CANCELLED
ON_THE_WAY       → ARRIVED, CANCELLED
ARRIVED          → CLEANING_STARTED, CANCELLED
CLEANING_STARTED → COMPLETED
COMPLETED        → (terminal)
CANCELLED        → (terminal)
REJECTED         → (terminal)
```

This table is implemented literally as a `Record<BookingStatus,
BookingStatus[]>` map in `bookings/booking-state-machine.ts`. The service
method looks up `allowedTransitions[current]`, and rejects with `409` if the
requested `to` isn't present — no transition is ever applied by direct
assignment to `booking.status`.

Every applied transition results in one `BookingStatusHistory` row
(`fromStatus`, `toStatus`, `changedById`, timestamp) in the same DB
transaction as the `Booking.status` update — the two writes are atomic.

## 3. End-to-end sequence (the critical path — see Rule 14 / API.md §5)

```
CUSTOMER                    API/DB                         ADMIN            CLEANER
   |  create draft              |                              |               |
   |  (wizard steps 1-6)  ----->| BookingsService.upsertDraft  |               |
   |  step 7: checkout   ----->| PricingService.calculate     |               |
   |                            | Booking.status=PENDING_PAYMENT               |
   |                            | Payment row created (PENDING)                |
   |  pay                ----->| PaymentProvider.charge()     |               |
   |                            | webhook/callback -> SUCCESS  |               |
   |                            | Booking.status=PAID -> CONFIRMED             |
   |                            | Notification: PAYMENT_SUCCESS -> customer    |
   |                            |                    appears in ---->|         |
   |                            |                    /admin/bookings|         |
   |                            |                    admin assigns  |         |
   |                            |<-- POST /bookings/:id/assign ------|         |
   |                            | CleanerAssignment(OFFERED)                   |
   |                            | Booking.status=CLEANER_ASSIGNED              |
   |                            | Notification: CLEANER_ASSIGNED -------------->| job appears
   |                            |<---------------------- accept ---------------|
   |                            | Assignment.status=ACCEPTED                   |
   |                            | Booking.status=CLEANER_ACCEPTED              |
   | sees "Cleaner confirmed" <-| Notification + WS: booking.status_changed    |
   |                            |<---------------------- on-the-way -----------|
   |                            | Booking.status=ON_THE_WAY                    |
   | sees "Sarah is en route" <-| WS push                                      |
   |                            |<---------------------- arrived --------------|
   |                            | Booking.status=ARRIVED                       |
   |                            |<---------------------- start -----------------|
   |                            | Booking.status=CLEANING_STARTED              |
   |                            |<---------------------- complete --------------|
   |                            | Booking.status=COMPLETED                     |
   |                            | Notification: REVIEW_REQUESTED -> customer   |
   |  submits review    ------->| Review created                               |
   |                            | CleanerProfile.ratingAverage recalculated    |
   |                            | Earnings aggregate updated (derived from     |
   |                            | COMPLETED bookings assigned to cleaner)      |
```

Every arrow that crosses into "DB" is a real Prisma write; every arrow that
crosses back out to a UI ("sees...") is either a REST GET (React Query
refetch/poll) or a WebSocket push — never client-only state.

## 4. Cleaner application workflow

```
PENDING → UNDER_REVIEW → APPROVED
                        → REJECTED
APPROVED → SUSPENDED (admin action, e.g. after complaints)
```

A CleanerProfile can only receive a `CleanerAssignment` if its linked
`CleanerApplication.status == APPROVED`. This is checked inside
`AssignmentService.assign()` before the row is created — enforced
server-side per Rule 7, not just filtered out of an admin dropdown.

## 5. Cleaner assignment strategy

- **Phase 1 (implemented now):** `POST /bookings/:id/assign` — admin manually
  picks an APPROVED cleaner. `AssignmentService.assign(bookingId, cleanerId,
  adminId)`.
- **Phase 2 (architected, pluggable):** `AssignmentService` exposes an
  `IAssignmentStrategy` interface. `ManualAssignmentStrategy` is the only
  implementation initially; a future `AutoMatchStrategy` can be swapped in
  behind the same `assign(bookingId): Promise<CleanerAssignment>` signature,
  scoring candidates by location, availability, service type match, rating,
  and current workload — without changing any caller.

## 6. Cancellation rules

- CUSTOMER can cancel from: `DRAFT, PENDING_PAYMENT, PAID, CONFIRMED,
  CLEANER_ASSIGNED, CLEANER_ACCEPTED` (i.e. any time before cleaning starts).
- ADMIN can cancel from any non-terminal state.
- Cancelling after `PAID` triggers a refund flow via `PaymentProvider.refund()`
  and a `PaymentStatus.REFUNDED` transition.
