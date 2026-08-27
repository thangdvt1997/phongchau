import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'cart' });
  return { title: t('title') };
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
