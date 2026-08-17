'use client';

import { useState } from 'react';
import { UserCog } from 'lucide-react';
import { useAdminCleaners, useSetCleanerStatus } from '@/lib/hooks';
import { AdminNav, AlertBox, Avatar, Content, EmptyState, Main, RatingValue, Screen, Spinner, StatusPill, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export default function AdminCleanersPage() {
  const { data: cleaners = [], isLoading, error } = useAdminCleaners();
  const setStatus = useSetCleanerStatus();
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const visible = filter === 'all' ? cleaners : cleaners.filter((c) => c.status === filter);

  async function onSetStatus(userId: number, status: string) {
    setBusyId(userId);
    setActionError('');
    try {
      await setStatus.mutateAsync({ userId, status });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <AdminNav active="/admin/cleaners" />
      <Main>
        <TopBar title="Cleaners" />
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
            <EmptyState icon={UserCog} title="No cleaners here" message="No cleaners match this filter." />
          ) : (
            <div className="md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3">
              {visible.map((c) => {
                const isBusy = busyId === c.id;
                return (
                  <div key={c.id} className="card mb-3 md:mb-0">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3 items-center">
                        <Avatar name={c.full_name} />
                        <div>
                          <div className="font-bold text-sm">{c.full_name}</div>
                          <div className="text-xs text-charcoal-muted mt-2">
                            {c.email} · {c.city || '—'}
                          </div>
                        </div>
                      </div>
                      <StatusPill status={c.status === 'approved' ? 'completed' : c.status} />
                    </div>
                    {c.bio && <p className="text-xs text-charcoal-muted mt-4">{c.bio}</p>}
                    {c.status === 'approved' && (
                      <div className="text-xs text-charcoal-muted mt-4 flex items-center gap-1.5">
                        <RatingValue value={c.rating} count={c.rating_count} />
                        <span>· {c.jobs_completed} jobs completed</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3.5">
                      {c.status === 'pending' && (
                        <>
                          <button
                            disabled={isBusy}
                            onClick={() => onSetStatus(c.id, 'approved')}
                            className="flex-1 px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => onSetStatus(c.id, 'rejected')}
                            className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-danger-bg text-danger cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <button
                          disabled={isBusy}
                          onClick={() => onSetStatus(c.id, 'suspended')}
                          className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-danger-bg text-danger cursor-pointer disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                      {c.status === 'suspended' && (
                        <button
                          disabled={isBusy}
                          onClick={() => onSetStatus(c.id, 'approved')}
                          className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-forest text-white cursor-pointer disabled:opacity-50"
                        >
                          Reinstate
                        </button>
                      )}
                      {c.status === 'rejected' && (
                        <button
                          disabled={isBusy}
                          onClick={() => onSetStatus(c.id, 'approved')}
                          className="px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold bg-sage text-forest-dark cursor-pointer disabled:opacity-50"
                        >
                          Approve anyway
                        </button>
                      )}
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
