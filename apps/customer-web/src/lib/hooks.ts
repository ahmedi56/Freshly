'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AdminCleaner,
  AdminCustomer,
  AdminOverview,
  AvailableCleaner,
  Booking,
  BookingStatus,
  CleanerEarnings,
  Extra,
  Quote,
  Service,
} from './types';

// ---- Catalog ----

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => api.get<{ services: Service[] }>('/services').then((d) => d.services),
  });
}

export function useExtras() {
  return useQuery({
    queryKey: ['extras'],
    queryFn: () => api.get<{ extras: Extra[] }>('/extras').then((d) => d.extras),
  });
}

export function useAvailableCleaners(enabled = true) {
  return useQuery({
    queryKey: ['cleaners', 'available'],
    queryFn: () => api.get<{ cleaners: AvailableCleaner[] }>('/cleaners/available').then((d) => d.cleaners),
    enabled,
  });
}

export function useQuoteMutation() {
  return useMutation({
    mutationFn: (payload: { service_id: number; rooms: number; extra_ids: number[] }) =>
      api.post<Quote>('/pricing/quote', payload),
  });
}

// ---- Bookings (customer/cleaner) ----

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: () => api.get<{ bookings: Booking[] }>('/bookings/mine').then((d) => d.bookings),
  });
}

export function useBooking(id: string | number) {
  return useQuery({
    queryKey: ['bookings', String(id)],
    queryFn: () => api.get<{ booking: Booking }>(`/bookings/${id}`).then((d) => d.booking),
    enabled: !!id,
  });
}

export interface CreateBookingPayload {
  service_id: number;
  property_type: string;
  rooms: number;
  extra_ids: number[];
  booking_date: string;
  time_slot: string;
  address: string;
  access_instructions: string;
  auto_assign: boolean;
  cleaner_id?: number;
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => api.post<{ booking: Booking }>('/bookings', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      api.patch<{ booking: Booking }>(`/bookings/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useDeclineBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ booking: Booking }>(`/bookings/${id}/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useRateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, review }: { id: number; rating: number; review: string }) =>
      api.post<{ booking: Booking }>(`/bookings/${id}/rate`, { rating, review }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['bookings', String(vars.id)] });
      qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
  });
}

// ---- Cleaner ----

export function useCleanerEarnings() {
  return useQuery({
    queryKey: ['cleaner', 'earnings'],
    queryFn: () => api.get<CleanerEarnings>('/cleaner/earnings'),
  });
}

// ---- Admin ----

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<AdminOverview>('/admin/overview'),
  });
}

export function useAdminBookings() {
  return useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: () => api.get<{ bookings: Booking[] }>('/admin/bookings').then((d) => d.bookings),
  });
}

export function useAssignCleaner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, cleanerId }: { bookingId: number; cleanerId: number }) =>
      api.patch<{ booking: Booking }>(`/admin/bookings/${bookingId}/assign`, { cleaner_id: cleanerId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => api.patch<{ booking: Booking }>(`/admin/bookings/${bookingId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
  });
}

export function useAdminCleaners() {
  return useQuery({
    queryKey: ['admin', 'cleaners'],
    queryFn: () => api.get<{ cleaners: AdminCleaner[] }>('/admin/cleaners').then((d) => d.cleaners),
  });
}

export function useSetCleanerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) =>
      api.patch(`/admin/cleaners/${userId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cleaners'] }),
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: () => api.get<{ customers: AdminCustomer[] }>('/admin/customers').then((d) => d.customers),
  });
}

export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => api.get<{ services: Service[] }>('/admin/services').then((d) => d.services),
  });
}

export interface ServiceFormPayload {
  name: string;
  category: string | null;
  base_price: number;
  icon: string | null;
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Partial<ServiceFormPayload> }) =>
      id ? api.patch<{ service: Service }>(`/admin/services/${id}`, payload) : api.post<{ service: Service }>('/admin/services', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useToggleServiceActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: 0 | 1 }) =>
      api.patch<{ service: Service }>(`/admin/services/${id}`, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
