import Link from 'next/link';
import Image from 'next/image';

const COLUMNS = [
  {
    title: 'Products',
    links: [
      { href: '/products?categorySlug=cashew', label: 'Cashew' },
      { href: '/products?categorySlug=coffee', label: 'Coffee' },
      { href: '/products?categorySlug=pepper', label: 'Pepper' },
      { href: '/products?categorySlug=rice-grains', label: 'Rice & Grains' },
      { href: '/products?categorySlug=coconut-products', label: 'Coconut Products' },
    ],
  },
  {
    title: 'Business',
    links: [
      { href: '/wholesale', label: 'Wholesale / B2B' },
      { href: '/rfq', label: 'Request a Quote' },
      { href: '/oem', label: 'OEM / Private Label' },
      { href: '/logistics', label: 'Logistics & Export' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/certifications', label: 'Certifications' },
      { href: '/blog', label: 'News & Knowledge' },
      { href: '/contact', label: 'Contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/logo-icon.png" alt="" width={28} height={21} className="h-7 w-auto" />
            <p className="text-lg font-bold text-brand-700">Phong Chau</p>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Vietnamese agricultural products, wholesale, OEM/ODM, and export logistics —
            farm to global market.
          </p>
        </div>
        {COLUMNS.map((col) => (
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
        <span>&copy; {new Date().getFullYear()} Phong Chau. All rights reserved.</span>
        <span className="flex gap-4">
          <Link href="/privacy" className="hover:text-brand-600">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-brand-600">
            Terms of Service
          </Link>
        </span>
      </div>
    </footer>
  );
}
