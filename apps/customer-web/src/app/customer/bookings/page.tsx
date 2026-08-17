'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { useMyBookings } from '@/lib/hooks';
import { fmtDate, fmtZAR } from '@/lib/format';
import { getServiceIcon } from '@/lib/catalog-icons';
import { AlertBox, Content, CustomerNav, EmptyState, Main, Screen, Spinner, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function CustomerHistoryPage() {
  const router = useRouter();
  const { data: bookings, isLoading, error } = useMyBookings();

  return (
    <Screen>
      <CustomerNav active="/customer/bookings" />
      <Main>
        <TopBar title="Your bookings" />
        <Content>
          <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
          {isLoading ? (
            <Spinner />
          ) : !bookings || bookings.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No bookings yet"
              message="Once you book a cleaning, it will show up here."
              actionLabel="Book a cleaning"
              onAction={() => router.push('/customer/book')}
            />
          ) : (
            <div className="md:grid md:grid-cols-2 md:gap-3">
              {bookings.map((b) => {
                const Icon = getServiceIcon(b.service_name);
                return (
                  <div
                    key={b.id}
                    onClick={() => router.push(`/customer/bookings/${b.id}`)}
                    className="card cursor-pointer hover:border-green transition-colors mb-3 md:mb-0"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Icon size={17} className="text-forest" strokeWidth={1.75} />
                        {b.service_name}
                      </div>
                      <StatusPill status={b.status} />
                    </div>
                    <div className="text-xs text-charcoal-muted mt-2">
                      {fmtDate(b.booking_date)} · {b.time_slot}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs text-charcoal-muted">{b.cleaner_name || 'Unassigned'}</span>
                      <span className="font-bold text-forest-dark">{fmtZAR(b.total)}</span>
                    </div>
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
