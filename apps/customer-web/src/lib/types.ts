// Canonical types live in @freshly/shared-types so the web app and the
// Expo mobile app (apps/cleaner-mobile) share the exact same wire contract.
export type {
  Role,
  CleanerProfile,
  User,
  Service,
  Extra,
  AvailableCleaner,
  Quote,
  BookingStatus,
  BookingEvent,
  Booking,
  CleanerEarnings,
  AdminOverview,
  AdminCleaner,
  AdminCustomer,
  Notification,
  AuthSession,
  ApiErrorBody,
} from '@freshly/shared-types';
