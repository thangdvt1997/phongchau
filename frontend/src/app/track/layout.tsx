import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Track the status and shipping progress of your Phong Chau order.',
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
