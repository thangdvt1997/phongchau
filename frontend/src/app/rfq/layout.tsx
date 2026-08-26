import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Request a Quote',
  description: 'Submit a request for quotation (RFQ) for bulk or export orders from Phong Chau.',
};

export default function RfqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
