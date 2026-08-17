'use client';

import { useRoleGuard } from '@/lib/use-role-guard';
import { Spinner } from '@/components/ui';

export default function CleanerLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRoleGuard('cleaner');
  if (!ready) return <Spinner />;
  return <>{children}</>;
}
