import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Logistics & Export',
  description: 'Domestic delivery and international export logistics, shipping zones, and instant freight estimates.',
};

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
