import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'registerB2b' });
  return { title: t('title') };
}

export default function RegisterB2bLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
