import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://37.49.225.142:8730';
const SITE_NAME = 'Phong Chau';
const SITE_DESCRIPTION =
  'Vietnamese agricultural products, wholesale B2B, OEM/ODM private label, and export logistics — cashew, coffee, pepper, rice, and coconut products from farm to global market.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Agricultural Products, Wholesale & Export`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Agricultural Products, Wholesale & Export`,
    description: SITE_DESCRIPTION,
    images: ['/logo-full.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Agricultural Products, Wholesale & Export`,
    description: SITE_DESCRIPTION,
    images: ['/logo-full.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <Header />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
