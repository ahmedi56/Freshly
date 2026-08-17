'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAdminBookings, useAssignCleaner, useAvailableCleaners, useCancelBooking } from '@/lib/hooks';
import { fmtDate, fmtZAR } from '@/lib/format';
import { AdminNav, AlertBox, Avatar, Content, EmptyState, Main, RatingValue, Screen, Spinner, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';
import type { Booking } from '@/lib/types';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'pending', label: 'Pending' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function AdminBookingsPage() {
  const { data: bookings = [], isLoading, error } = useAdminBookings();
  const { data: cleaners = [] } = useAvailableCleaners();
  const assignCleaner = useAssignCleaner();
  const cancelBooking = useCancelBooking();

  const [filter, setFilter] = useState('all');
  const [assignModalBookingId, setAssignModalBookingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const visible = bookings.filter((b: Booking) => {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !b.cleaner_id && !['completed', 'cancelled'].includes(b.status);
    return b.status === filter;
  });

  async function onAssign(bookingId: number, cleanerId: number) {
    setBusyId(bookingId);
    setActionError('');
    setAssignModalBookingId(null);
    try {
      await assignCleaner.mutateAsync({ bookingId, cleanerId });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  async function onCancel(bookingId: number) {
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    setBusyId(bookingId);
    setActionError('');
    try {
      await cancelBooking.mutateAsync(bookingId);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  const modalBooking = bookings.find((b) => b.id === assignModalBookingId);

  return (
    <Screen>
      <AdminNav active="/admin/bookings" />
      <Main>
        <TopBar title="All bookings" />
        <Content wide>
          <AlertBox
            message={actionError || (error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null)}
          />
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2.5 rounded-full border-[1.5px] text-[13px] font-semibold cursor-pointer whitespace-nowrap ${
                  filter === f.id ? 'bg-forest border-forest text-white' : 'border-border bg-card-white text-charcoal-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {isLoading ? (
            <Spinner />
          ) : visible.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No bookings" message="No bookings match this filter." />
          ) : (
            <div className="overflow-x-auto card !p-0">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {['ID', 'Service', 'Customer', 'Cleaner', 'Date', 'Total', 'Status', 'Actions'].map((t) => (
                      <th
                        key={t}
                        className="text-left px-4 py-3 text-charcoal-muted font-semibold border-b border-border whitespace-nowrap"
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => {
                    const isBusy = busyId === b.id;
                    return (
                      <tr key={b.id} className="hover:bg-sage/30 transition-colors">
                        <Td>#{b.id}</Td>
                        <Td>{b.service_name}</Td>
                        <Td>{b.customer_name}</Td>
                        <Td>{b.cleaner_name || <span className="text-charcoal-muted">Unassigned</span>}</Td>
                        <Td>{fmtDate(b.booking_date)}</Td>
                        <Td>{fmtZAR(b.total)}</Td>
                        <Td>
                          <StatusPill status={b.status} />
                        </Td>
                        <Td>
                          <div className="flex gap-1.5">
                            {!['completed', 'cancelled'].includes(b.status) && (
                              <button
                                disabled={isBusy}
                                onClick={() => setAssignModalBookingId(b.id)}
                                className="px-3.5 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-sage text-forest-dark cursor-pointer disabled:opacity-50"
                              >
                                {b.cleaner_id ? 'Reassign' : 'Assign'}
                              </button>
                            )}
                            {!['completed', 'cancelled'].includes(b.status) && (
                              <button
                                disabled={isBusy}
                                onClick={() => onCancel(b.id)}
                                className="px-3.5 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-danger-bg text-danger cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Content>
      </Main>

      {modalBooking && (
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center z-100"
          style={{ background: 'rgba(15, 42, 30, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssignModalBookingId(null);
          }}
        >
          <div className="bg-card-white w-full max-w-[480px] rounded-t-[24px] md:rounded-[24px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] md:pb-5 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-border rounded mx-auto mb-4.5 md:hidden" />
            <h3 className="mb-4">Assign a cleaner</h3>
            <p className="text-sm text-charcoal-muted mb-4">
              {modalBooking.service_name} · {fmtDate(modalBooking.booking_date)}
            </p>
            {cleaners.length === 0 ? (
              <p className="text-sm text-charcoal-muted">No approved cleaners available.</p>
            ) : (
              cleaners.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onAssign(modalBooking.id, c.id)}
                  className="flex items-center gap-3 p-3.5 border-[1.5px] border-border rounded-[var(--radius-md)] mb-2.5 cursor-pointer"
                >
                  <Avatar name={c.full_name} />
                  <div>
                    <div className="font-semibold text-sm">{c.full_name}</div>
                    <div className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-1.5">
                      <RatingValue value={c.rating} />
                      <span>· {c.jobs_completed} jobs</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setAssignModalBookingId(null)}
              className="w-full mt-4 py-3.5 rounded-[var(--radius-md)] font-semibold bg-transparent border-[1.5px] border-border text-forest cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 border-b border-border align-middle whitespace-nowrap">{children}</td>;
}
