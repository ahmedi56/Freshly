'use client';

import { Wallet } from 'lucide-react';
import { useCleanerEarnings } from '@/lib/hooks';
import { fmtDateTime, fmtZAR } from '@/lib/format';
import { AlertBox, CleanerNav, Content, EmptyState, Main, RatingValue, Screen, Spinner, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function CleanerEarningsPage() {
  const { data, isLoading, error } = useCleanerEarnings();

  return (
    <Screen>
      <CleanerNav active="/cleaner/earnings" />
      <Main>
        <TopBar title="Earnings" />
        <Content wide>
          <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
          {isLoading ? (
            <Spinner />
          ) : !data ? null : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <Kpi label="Today's earnings" value={fmtZAR(data.today_earnings)} />
                <Kpi label="Total earnings" value={fmtZAR(data.total_earnings)} />
                <Kpi label="Completed jobs" value={String(data.completed_jobs)} />
                <Kpi label="Rating" value={<RatingValue value={data.rating} size={18} />} />
              </div>
              <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wide mb-2.5">
                Recent completed jobs
              </div>
              {data.recent_completed.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No completed jobs yet"
                  message="Completed jobs and their earnings will appear here."
                />
              ) : (
                <div className="md:grid md:grid-cols-2 md:gap-3">
                  {data.recent_completed.map((j) => (
                    <div key={j.id} className="card mb-3 md:mb-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-sm">{j.service_name}</div>
                          <div className="text-xs text-charcoal-muted mt-2">
                            {j.customer_name} · {fmtDateTime(j.updated_at)}
                          </div>
                        </div>
                        <span className="font-bold text-forest-dark">{fmtZAR(j.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Content>
      </Main>
    </Screen>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card">
      <div className="text-xs text-charcoal-muted font-semibold mb-1.5">{label}</div>
      <div className="text-[22px] font-extrabold text-forest-dark">{value}</div>
    </div>
  );
}
