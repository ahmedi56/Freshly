'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth, defaultRouteForRole } from '@/lib/auth-context';
import { AlertBox, Button } from '@/components/ui';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ user: User }>('/auth/login', {
        email: email.trim(),
        password,
      });
      login(data.user);
      router.push(defaultRouteForRole(data.user.role));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-[480px] mx-auto w-full min-h-screen">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/logo.png" alt="Freshly" width={88} height={88} priority className="mb-2" />
        <div className="text-charcoal-muted text-[15px]">
          Trusted home & office cleaning, on your schedule.
        </div>
      </div>
      <AlertBox message={error} />
      <form onSubmit={onSubmit}>
        <div className="mb-4 field">
          <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Email</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.co.za"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-4 field">
          <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full md:w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="text-center mt-5 text-sm text-charcoal-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-forest font-semibold">
          Sign up
        </Link>
      </div>
      <div className="card mt-4 text-xs text-charcoal-muted">
        <strong className="text-charcoal">Demo accounts</strong> (password: password123)
        <br />
        Customer: thabo@example.co.za
        <br />
        Cleaner: nomvula@example.co.za
        <br />
        Admin: admin@freshly.co.za
      </div>
    </div>
  );
}
