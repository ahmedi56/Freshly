'use client';

import { Receipt } from 'lucide-react';
import { useAdminCustomers } from '@/lib/hooks';
import { fmtDate, fmtZAR } from '@/lib/format';
import { AdminNav, AlertBox, Content, EmptyState, Main, Screen, Spinner, TopBar } from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function AdminCustomersPage() {
  const { data: customers = [], isLoading, error } = useAdminCustomers();

  return (
    <Screen>
      <AdminNav active="/admin/customers" />
      <Main>
        <TopBar title="Customers" />
        <Content wide>
          <AlertBox message={error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null} />
          {isLoading ? (
            <Spinner />
          ) : customers.length === 0 ? (
            <EmptyState icon={Receipt} title="No customers yet" message="Customers will appear here once they register." />
          ) : (
            <div className="overflow-x-auto card !p-0">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {['Name', 'Email', 'Phone', 'Bookings', 'Lifetime value', 'Joined'].map((t) => (
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
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-sage/30 transition-colors">
                      <Td>{c.full_name}</Td>
                      <Td>{c.email}</Td>
                      <Td>{c.phone || '—'}</Td>
                      <Td>{c.booking_count}</Td>
                      <Td className="font-bold text-forest-dark">{fmtZAR(c.lifetime_value)}</Td>
                      <Td>{fmtDate((c.created_at || '').slice(0, 10))}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Content>
      </Main>
    </Screen>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 border-b border-border align-middle whitespace-nowrap ${className}`}>{children}</td>;
}
