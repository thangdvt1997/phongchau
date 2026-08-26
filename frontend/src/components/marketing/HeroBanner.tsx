import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * Shared full-bleed hero banner: background photo + brand-toned gradient scrim + centered
 * or left-aligned content. Used for the homepage hero and the page-level heroes on
 * About / Wholesale / Logistics / Certifications. Purely presentational — callers pass
 * their own heading/copy/CTAs as children so page-specific content and links never move here.
 */
export function HeroBanner({
  image,
  alt,
  eyebrow,
  align = 'center',
  size = 'lg',
  children,
}: {
  image: string;
  alt: string;
  eyebrow?: string;
  align?: 'center' | 'left';
  size?: 'lg' | 'md';
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      <div className="absolute inset-0">
        <Image src={image} alt={alt} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-900/80 to-brand-700/70" />
      </div>
      <div
        className={`relative mx-auto max-w-7xl px-6 ${size === 'lg' ? 'py-24 md:py-32' : 'py-16 md:py-20'} ${
          align === 'center' ? 'text-center' : 'text-left'
        }`}
      >
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-100">{eyebrow}</p>
        )}
        <div className={align === 'center' ? 'mx-auto max-w-3xl' : 'max-w-3xl'}>{children}</div>
      </div>
    </section>
  );
}
