'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

export default function ContactPage() {
  const t = useTranslations('contact');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', companyName: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/contact', form);
      setSubmitted(true);
    } catch {
      setError(t('genericError'));
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415L8.5 12.086l6.79-6.795a1 1 0 011.414 0z"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">{t('successTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('successBody')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 overflow-hidden px-6 py-16 md:grid-cols-2 md:gap-12 md:py-24">
      <div className="relative order-2 hidden overflow-hidden rounded-xl2 shadow-lifted md:order-1 md:block">
        <Image
          src="/images/business/modern-office.jpg"
          alt="Modern office workspace"
          fill
          sizes="40vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 to-transparent" />
        <div className="absolute bottom-0 p-8 text-white">
          <p className="text-lg font-semibold">{t('sideQuote')}</p>
          <p className="mt-2 text-sm text-brand-100">{t('sideNote')}</p>
        </div>
      </div>

      <div className="order-1 md:order-2">
        <p className="section-eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="contact-fullname" className="text-sm font-medium text-gray-700">
              {t('fullNameLabel')}
            </label>
            <input
              id="contact-fullname"
              required
              placeholder={t('fullNameLabel')}
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="text-sm font-medium text-gray-700">
              {t('emailLabel')}
            </label>
            <input
              id="contact-email"
              type="email"
              placeholder={t('emailLabel')}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className="text-sm font-medium text-gray-700">
              {t('phoneLabel')}
            </label>
            <input
              id="contact-phone"
              placeholder={t('phoneLabel')}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="contact-company" className="text-sm font-medium text-gray-700">
              {t('companyLabel')}
            </label>
            <input
              id="contact-company"
              placeholder={t('companyLabel')}
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="text-sm font-medium text-gray-700">
              {t('messageLabel')}
            </label>
            <textarea
              id="contact-message"
              required
              placeholder={t('messageLabel')}
              rows={4}
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            {t('sendMessage')}
          </button>
        </form>
      </div>
    </div>
  );
}
