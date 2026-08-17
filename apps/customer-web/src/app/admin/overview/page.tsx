'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Clock } from 'lucide-react';
import { useAdminOverview } from '@/lib/hooks';
import { fmtZAR } from '@/lib/format';
import { AdminNav, AlertBox, Content, Main, Screen, Spinner, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function AdminOverviewPage() {
  const router = useRouter();
  const { data, isLoading, error } = useAdminOverview();

  return (
    <Screen>
      <AdminNav active="/admin/overview" />
      <Main>
        <TopBar title="Admin overview" />
        <Content wide>
          <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
          {isLoading ? (
            <Spinner />
          ) : !data ? null : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <Kpi label="Today's revenue" value={fmtZAR(data.today_revenue)} />
                <Kpi label="Total revenue" value={fmtZAR(data.total_revenue)} />
                <Kpi label="Total bookings" value={String(data.total_bookings)} />
                <Kpi label="Active cleaners" value={String(data.active_cleaners)} />
              </div>
              {data.pending_applications > 0 && (
                <div
                  onClick={() => router.push('/admin/cleaners')}
                  className="card cursor-pointer mb-4"
                  style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold flex items-center gap-2">
                      <Clock size={17} strokeWidth={1.75} />
                      {data.pending_applications} cleaner application(s) awaiting review
                    </span>
                    <ChevronRight size={18} />
                  </div>
                </div>
              )}
              <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                Bookings by status
              </div>
              <div className="card md:max-w-[480px]">
                {data.bookings_by_status.map((row) => (
                  <div key={row.status} className="flex justify-between items-center mt-4 first:mt-0">
                    <StatusPill status={row.status} />
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Content>
      </Main>
    </Screen>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs text-charcoal-muted font-semibold mb-1.5">{label}</div>
      <div className="text-[22px] font-extrabold text-forest-dark">{value}</div>
    </div>
  );
}
