// Shared between apps/customer-web (Next.js) and apps/cleaner-mobile (Expo).
// Mirrors the Express API's actual response shapes in backend/src/routes/*.
// Keep this the single source of truth for the wire contract — if a route's
// response shape changes, update it here first.

export type Role = 'customer' | 'cleaner' | 'admin';

export interface CleanerProfile {
  user_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  city: string | null;
  province: string | null;
  bio: string | null;
  rating: number;
  rating_count: number;
  jobs_completed: number;
  applied_at?: string;
}

export interface User {
  id: number;
  role: Role;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  cleaner_profile?: CleanerProfile;
}

export interface Service {
  id: number;
  name: string;
  category: string | null;
  base_price: number;
  icon: string | null;
  active: number;
}

export interface Extra {
  id: number;
  name: string;
  price: number;
  icon: string | null;
  active: number;
}

export interface AvailableCleaner {
  id: number;
  full_name: string;
  city: string | null;
  province: string | null;
  bio: string | null;
  rating: number;
  rating_count: number;
  jobs_completed: number;
}

export interface Quote {
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  service: Service;
  extras: Extra[];
  rooms: number;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'cleaning'
  | 'completed'
  | 'cancelled';

export interface BookingEvent {
  id: number;
  booking_id: number;
  status: string;
  note: string | null;
  actor_user_id: number | null;
  created_at: string;
}

export interface Booking {
  id: number;
  customer_id: number;
  cleaner_id: number | null;
  service_id: number;
  service_name: string;
  service_icon: string | null;
  customer_name?: string;
  customer_phone?: string;
  cleaner_name: string | null;
  cleaner_phone?: string | null;
  property_type: string | null;
  rooms: number;
  extras_json: string;
  extras_ids?: number[];
  extras?: Extra[];
  booking_date: string;
  time_slot: string;
  address: string;
  access_instructions: string | null;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  status: BookingStatus;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
  events?: BookingEvent[];
}

export interface CleanerEarnings {
  today_earnings: number;
  total_earnings: number;
  completed_jobs: number;
  rating: number;
  rating_count: number;
  recent_completed: Array<{
    id: number;
    total: number;
    updated_at: string;
    service_name: string;
    customer_name: string;
  }>;
}

export interface AdminOverview {
  today_revenue: number;
  total_revenue: number;
  total_bookings: number;
  active_cleaners: number;
  pending_applications: number;
  bookings_by_status: Array<{ status: string; count: number }>;
}

export interface AdminCleaner {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  city: string | null;
  province: string | null;
  bio: string | null;
  rating: number;
  rating_count: number;
  jobs_completed: number;
  applied_at: string;
}

export interface AdminCustomer {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  booking_count: number;
  lifetime_value: number;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  read: number;
  created_at: string;
}

// ---- Auth response shapes ----
// Web clients get the same payload but never need to read accessToken/
// refreshToken from it — those are set as httpOnly cookies by the server.
// Native clients (no cookie jar) read them and store them in secure device
// storage, sending accessToken as `Authorization: Bearer <token>` and
// refreshToken in the body of POST /auth/refresh.
export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export interface ApiErrorBody {
  error: string;
}
