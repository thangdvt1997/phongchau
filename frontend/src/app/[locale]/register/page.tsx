'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { registerRetail } = useAuth();
  const router = useRouter();
  const t = useTranslations('register');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await registerRetail(form);
      router.push('/account');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('genericError'));
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
      <h1 className="mt-6 text-2xl font-bold text-gray-900">{t('title')}</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="register-fullname" className="text-sm font-medium text-gray-700">
            {t('fullNameLabel')}
          </label>
          <input
            id="register-fullname"
            required
            placeholder={t('fullNameLabel')}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="register-email" className="text-sm font-medium text-gray-700">
            {t('emailLabel')}
          </label>
          <input
            id="register-email"
            type="email"
            required
            placeholder={t('emailLabel')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="register-phone" className="text-sm font-medium text-gray-700">
            {t('phoneLabel')}
          </label>
          <input
            id="register-phone"
            placeholder={t('phoneLabel')}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="text-sm font-medium text-gray-700">
            {t('passwordLabel')}
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            placeholder={t('passwordPlaceholder')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? t('creatingAccount') : t('register')}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          {t('signInLink')}
        </Link>
      </p>
    </div>
  );
}
