import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OEM / Private Label Request',
  description:
    'Submit an OEM/ODM private-label manufacturing request to Phong Chau — custom recipe, packaging, and branding for your market.',
};

export default function OemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
