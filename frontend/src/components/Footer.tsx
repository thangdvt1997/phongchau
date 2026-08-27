'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import viMessages from '../../messages/vi.json';
import enMessages from '../../messages/en.json';

// See Header.tsx for why this reads locale from the URL and the raw message JSON instead of
// `useTranslations()` — Footer is rendered once by the shared root layout, outside the
// NextIntlClientProvider boundary, for both the storefront and the untouched /admin/** tree.
const MESSAGES = { vi: viMessages, en: enMessages } as const;

export function Footer() {
  const pathname = usePathname() ?? '/';
  const isAdmin = pathname.startsWith('/admin');
  const locale: 'vi' | 'en' = pathname.startsWith('/en') ? 'en' : 'vi';
  const t = MESSAGES[locale].footer;
  const prefix = isAdmin ? '' : `/${locale}`;

  const columns = [
    {
      title: isAdmin ? 'Products' : t.productsHeading,
      links: [
        { href: `${prefix}/products?categorySlug=cashew`, label: isAdmin ? 'Cashew' : t.cashew },
        { href: `${prefix}/products?categorySlug=coffee`, label: isAdmin ? 'Coffee' : t.coffee },
        { href: `${prefix}/products?categorySlug=pepper`, label: isAdmin ? 'Pepper' : t.pepper },
        { href: `${prefix}/products?categorySlug=rice-grains`, label: isAdmin ? 'Rice & Grains' : t.riceGrains },
        {
          href: `${prefix}/products?categorySlug=coconut-products`,
          label: isAdmin ? 'Coconut Products' : t.coconutProducts,
        },
      ],
    },
    {
      title: isAdmin ? 'Business' : t.businessHeading,
      links: [
        { href: `${prefix}/wholesale`, label: isAdmin ? 'Wholesale / B2B' : t.wholesaleB2b },
        { href: `${prefix}/rfq`, label: isAdmin ? 'Request a Quote' : t.requestQuote },
        { href: `${prefix}/oem`, label: isAdmin ? 'OEM / Private Label' : t.oemPrivateLabel },
        { href: `${prefix}/logistics`, label: isAdmin ? 'Logistics & Export' : t.logisticsExport },
      ],
    },
    {
      title: isAdmin ? 'Company' : t.companyHeading,
      links: [
        { href: `${prefix}/about`, label: isAdmin ? 'About Us' : t.aboutUs },
        { href: `${prefix}/certifications`, label: isAdmin ? 'Certifications' : t.certifications },
        { href: `${prefix}/blog`, label: isAdmin ? 'News & Knowledge' : t.newsKnowledge },
        { href: `${prefix}/contact`, label: isAdmin ? 'Contact' : t.contact },
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/logo-icon.png" alt="" width={28} height={21} className="h-7 w-auto" />
            <p className="text-lg font-bold text-brand-700">Phong Chau</p>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {isAdmin
              ? 'Vietnamese agricultural products, wholesale, OEM/ODM, and export logistics — farm to global market.'
              : t.tagline}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-semibold text-gray-900">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-brand-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 border-t border-gray-200 py-4 text-center text-xs text-gray-500 sm:flex-row sm:justify-between sm:px-6">
        <span>
          &copy; {new Date().getFullYear()} Phong Chau. {isAdmin ? 'All rights reserved.' : t.rights}
        </span>
        <span className="flex gap-4">
          <Link href={`${prefix}/privacy`} className="hover:text-brand-600">
            {isAdmin ? 'Privacy Policy' : t.privacyPolicy}
          </Link>
          <Link href={`${prefix}/terms`} className="hover:text-brand-600">
            {isAdmin ? 'Terms of Service' : t.termsOfService}
          </Link>
        </span>
      </div>
    </footer>
  );
}
