import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'track' });
  return { title: t('title') };
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
