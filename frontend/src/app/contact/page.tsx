'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function ContactPage() {
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
      setError('Something went wrong. Please try again.');
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-700">Message Sent</h1>
        <p className="mt-2 text-gray-600">Thanks for reaching out — our team will respond shortly.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="contact-fullname" className="text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="contact-fullname"
            required
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className="text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="contact-phone"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="contact-company" className="text-sm font-medium text-gray-700">
            Company (optional)
          </label>
          <input
            id="contact-company"
            placeholder="Company (optional)"
            value={form.companyName}
            onChange={(e) => update('companyName', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="contact-message"
            required
            placeholder="Message"
            rows={4}
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white">
          Send Message
        </button>
      </form>
    </div>
  );
}
