import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apply for a B2B Account',
  description: 'Apply for a wholesale / B2B account with Phong Chau to unlock tiered pricing and contract terms.',
};

export default function RegisterB2bLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
