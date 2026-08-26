import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Products',
    links: [
      { href: '/products/category/cashew', label: 'Cashew' },
      { href: '/products/category/coffee', label: 'Coffee' },
      { href: '/products/category/pepper', label: 'Pepper' },
      { href: '/products/category/rice-grains', label: 'Rice & Grains' },
      { href: '/products/category/coconut-products', label: 'Coconut Products' },
    ],
  },
  {
    title: 'Business',
    links: [
      { href: '/wholesale', label: 'Wholesale / B2B' },
      { href: '/rfq', label: 'Request a Quote' },
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
          <p className="text-lg font-bold text-brand-700">Phong Chau</p>
          <p className="mt-2 text-sm text-gray-600">
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
      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Phong Chau. All rights reserved.
      </div>
    </footer>
  );
}
