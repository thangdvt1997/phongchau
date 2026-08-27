import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Runs locale detection/redirect/rewrite for every public route (including `/`, which
  // redirects to the default locale `/vi`), but explicitly EXCLUDES:
  //  - /admin/**   — the admin panel stays English-only and unprefixed (owned by another
  //                  concurrent workstream; must not be touched by locale routing at all)
  //  - /api/**     — any Next.js API routes
  //  - /_next/**, /_vercel/** — framework internals
  //  - any path containing a dot (static files: /favicon.ico, /images/*.jpg, /manifest.json, etc.)
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
