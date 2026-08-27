import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware wrappers around next/navigation's Link/router/pathname APIs — these
// automatically prefix hrefs with the current locale so internal navigation never drops
// the user out of /vi/... or /en/.... Use these (not next/link) in every page/component
// that lives under app/[locale]/, and in any shared component rendered inside that tree.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
