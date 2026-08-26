import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'View your order history, RFQs, and account details.',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
