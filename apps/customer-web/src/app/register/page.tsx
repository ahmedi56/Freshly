'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth, defaultRouteForRole } from '@/lib/auth-context';
import { AlertBox, Button } from '@/components/ui';
import type { Role, User } from '@/lib/types';

export default function RegisterPage() {
  const [role, setRole] = useState<Extract<Role, 'customer' | 'cleaner'>>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ user: User; message?: string }>('/auth/register', {
        role,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        city: role === 'cleaner' ? city.trim() : undefined,
        province: role === 'cleaner' && city.trim() ? 'Gauteng' : undefined,
      });
      if (role === 'cleaner') {
        setSuccessMsg(
          data.message || 'Application submitted — pending admin approval. You can log in once approved.'
        );
        setLoading(false);
      } else {
        login(data.user);
        router.push(defaultRouteForRole(data.user.role));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-[480px] mx-auto w-full min-h-screen">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/logo.png" alt="Freshly" width={88} height={88} priority className="mb-2" />
        <div className="text-charcoal-muted text-[15px]">Create your account</div>
      </div>
      <AlertBox message={error} />
      <AlertBox message={successMsg} type="info" />
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setRole('customer')}
          className={`flex-1 py-3 rounded-[var(--radius-sm)] border-[1.5px] font-semibold text-sm cursor-pointer ${
            role === 'customer'
              ? 'border-forest bg-sage text-forest-dark'
              : 'border-border bg-card-white text-charcoal-muted'
          }`}
        >
          I need cleaning
        </button>
        <button
          type="button"
          onClick={() => setRole('cleaner')}
          className={`flex-1 py-3 rounded-[var(--radius-sm)] border-[1.5px] font-semibold text-sm cursor-pointer ${
            role === 'cleaner'
              ? 'border-forest bg-sage text-forest-dark'
              : 'border-border bg-card-white text-charcoal-muted'
          }`}
        >
          I&apos;m a cleaner
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="mb-4 field">
          <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Full name</label>
          <input placeholder="Jane Dlamini" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="mb-4 field">
          <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Email</label>
          <input
            type="email"
            placeholder="you@example.co.za"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-4 field">
          <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Phone</label>
          <input placeholder="082 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {role === 'cleaner' && (
          <div className="mb-4 field">
            <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">City</label>
            <input placeholder="Sandton" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        )}
        <div className="mb-4 field">
          <label className="block text-[13px] font-semibold text-charcoal-muted mb-1.5">Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full md:w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <div className="text-center mt-5 text-sm text-charcoal-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-forest font-semibold">
          Sign in
        </Link>
      </div>
    </div>
  );
}
