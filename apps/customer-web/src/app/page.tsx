'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, defaultRouteForRole } from '@/lib/auth-context';
import { Spinner } from '@/components/ui';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? defaultRouteForRole(user.role) : '/login');
  }, [loading, user, router]);

  return <Spinner />;
}
