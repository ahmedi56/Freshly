'use client';

import { useRouter } from 'next/navigation';
import { Plus, SprayCan } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useMyBookings } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import { ServiceIcon } from '@/lib/catalog-icons';
import {
  AlertBox,
  Button,
  Content,
  CustomerNav,
  Main,
  Screen,
  Spinner,
  StatusPill,
  TopBar,
  EmptyState,
} from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function CustomerHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: bookings, isLoading, error } = useMyBookings();

  const upcoming = bookings?.find((b) => !['completed', 'cancelled'].includes(b.status));

  return (
    <Screen>
      <CustomerNav active="/customer/home" />
      <Main>
        <TopBar title="Freshly" />
        <Content>
          <h2 className="mb-4 text-xl">Hi {user?.full_name.split(' ')[0]}</h2>
          <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
          {isLoading ? (
            <Spinner />
          ) : (
            <div>
              {upcoming ? (
                <div
                  className="card cursor-pointer hover:border-green transition-colors"
                  onClick={() => router.push(`/customer/bookings/${upcoming.id}`)}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2.5">
                      <ServiceIcon name={upcoming.service_name} size={20} className="text-forest shrink-0" strokeWidth={1.75} />
                      <div>
                        <div className="font-bold text-[15px]">{upcoming.service_name}</div>
                        <div className="text-xs text-charcoal-muted mt-1">
                          {fmtDate(upcoming.booking_date)} · {upcoming.time_slot}
                        </div>
                      </div>
                    </div>
                    <StatusPill status={upcoming.status} />
                  </div>
                  <div className="text-xs text-charcoal-muted">
                    {upcoming.cleaner_name ? `Cleaner: ${upcoming.cleaner_name}` : 'Finding you a cleaner…'}
                  </div>
                </div>
              ) : (
                <div className="card">
                  <EmptyState
                    icon={SprayCan}
                    title="No upcoming bookings"
                    message="Book your first cleaning in a few taps."
                    actionLabel="Book a cleaning"
                    onAction={() => router.push('/customer/book')}
                  />
                </div>
              )}

              <Button className="mt-4" onClick={() => router.push('/customer/book')}>
                <Plus size={17} strokeWidth={2.25} />
                Book a cleaning
              </Button>
            </div>
          )}
        </Content>
      </Main>
    </Screen>
  );
}
