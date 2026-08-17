import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Booking, BookingStatus, CleanerEarnings } from '@freshly/shared-types';

export function useMyJobs() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: () => api.get<{ bookings: Booking[] }>('/bookings/mine').then((d) => d.bookings),
  });
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      api.patch<{ booking: Booking }>(`/bookings/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useDeclineJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ booking: Booking }>(`/bookings/${id}/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useEarnings() {
  return useQuery({
    queryKey: ['cleaner', 'earnings'],
    queryFn: () => api.get<CleanerEarnings>('/cleaner/earnings'),
  });
}
