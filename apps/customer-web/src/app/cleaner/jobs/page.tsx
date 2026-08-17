'use client';

import { useState } from 'react';
import { Calendar, MapPin, Plus, SprayCan } from 'lucide-react';
import { useDeclineBooking, useMyBookings, useUpdateBookingStatus } from '@/lib/hooks';
import { fmtDate, fmtZAR } from '@/lib/format';
import { getServiceIcon } from '@/lib/catalog-icons';
import { AlertBox, CleanerNav, Content, EmptyState, Main, Screen, Spinner, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';
import type { Booking, BookingStatus } from '@/lib/types';

const NEXT_ACTION: Record<string, { label: string; next: BookingStatus }> = {
  assigned: { label: 'Start heading over', next: 'on_the_way' },
  on_the_way: { label: 'Mark as arrived', next: 'arrived' },
  arrived: { label: 'Start cleaning', next: 'cleaning' },
  cleaning: { label: 'Mark as completed', next: 'completed' },
};

type Filter = 'active' | 'completed' | 'all';

export default function CleanerJobsPage() {
  const { data: bookings = [], isLoading, error } = useMyBookings();
  const updateStatus = useUpdateBookingStatus();
  const declineBooking = useDeclineBooking();
  const [filter, setFilter] = useState<Filter>('active');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const visible = bookings.filter((b: Booking) => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(b.status);
    if (filter === 'completed') return b.status === 'completed';
    return true;
  });

  async function onUpdateStatus(id: number, status: BookingStatus) {
    setBusyId(id);
    setActionError('');
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  async function onDecline(id: number) {
    setBusyId(id);
    setActionError('');
    try {
      await declineBooking.mutateAsync(id);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <CleanerNav active="/cleaner/jobs" />
      <Main>
        <TopBar title="Your jobs" />
        <Content wide>
          <AlertBox
            message={actionError || (error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null)}
          />
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
            {(['active', 'completed', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-full border-[1.5px] text-[13px] font-semibold cursor-pointer whitespace-nowrap capitalize ${
                  filter === f ? 'bg-forest border-forest text-white' : 'border-border bg-card-white text-charcoal-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {isLoading ? (
            <Spinner />
          ) : visible.length === 0 ? (
            <EmptyState icon={SprayCan} title="No jobs here" message="New jobs assigned to you will show up here." />
          ) : (
            <div className="md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3">
              {visible.map((b: Booking) => {
                const action = NEXT_ACTION[b.status];
                const isBusy = busyId === b.id;
                const ServiceIcon = getServiceIcon(b.service_name);
                return (
                  <div key={b.id} className="card mb-3 md:mb-0">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-start gap-2">
                        <ServiceIcon size={18} className="text-forest mt-0.5 shrink-0" strokeWidth={1.75} />
                        <div>
                          <div className="font-bold text-[15px] text-forest-dark">{b.service_name}</div>
                          <div className="text-[13px] text-charcoal-muted mt-0.5">{b.customer_name}</div>
                        </div>
                      </div>
                      <StatusPill status={b.status} />
                    </div>
                    <div className="flex gap-2 items-center text-[13px] text-charcoal-muted mb-1">
                      <Calendar size={14} />
                      <span>
                        {fmtDate(b.booking_date)} · {b.time_slot}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center text-[13px] text-charcoal-muted mb-1">
                      <MapPin size={14} />
                      <span>{b.address}</span>
                    </div>
                    {b.extras_ids && b.extras_ids.length > 0 && (
                      <div className="flex gap-2 items-center text-[13px] text-charcoal-muted mb-1">
                        <Plus size={14} />
                        <span>{b.extras_ids.length} extra(s)</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-bold text-forest-dark text-[15px]">{fmtZAR(b.total)}</span>
                    </div>
                    {(action || b.status === 'assigned') && (
                      <div className="flex gap-2 mt-3.5">
                        {b.status === 'assigned' && (
                          <button
                            disabled={isBusy}
                            onClick={() => onDecline(b.id)}
                            className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold border-[1.5px] border-border bg-transparent text-forest cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        )}
                        {action && (
                          <button
                            disabled={isBusy}
                            onClick={() => onUpdateStatus(b.id, action.next)}
                            className="flex-1 px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? 'Updating…' : action.label}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Content>
      </Main>
    </Screen>
  );
}
