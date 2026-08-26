'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/account');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Image
        src="/logo-full.png"
        alt="Phong Chau"
        width={200}
        height={80}
        className="mx-auto h-20 w-auto"
      />
      <h1 className="mt-6 text-2xl font-bold text-gray-900">Sign In</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        No account?{' '}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          Register
        </Link>{' '}
        or{' '}
        <Link href="/register/b2b" className="font-medium text-brand-700 hover:underline">
          apply as a wholesale/B2B customer
        </Link>
        .
      </p>
    </div>
  );
}
