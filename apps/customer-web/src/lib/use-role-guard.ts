'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, defaultRouteForRole } from './auth-context';
import type { Role } from './types';

export function useRoleGuard(allowed: Role) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== allowed) {
      router.replace(defaultRouteForRole(user.role));
    }
  }, [loading, user, allowed, router]);

  return { user, ready: !loading && !!user && user.role === allowed };
}
