'use client';

import { useRoleGuard } from '@/lib/use-role-guard';
import { Spinner } from '@/components/ui';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRoleGuard('customer');
  if (!ready) return <Spinner />;
  return <>{children}</>;
}
