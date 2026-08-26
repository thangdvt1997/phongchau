// Server components run inside the Docker network, so they should hit the backend service
// directly rather than bouncing back out through the public URL/Nginx.
const API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://backend:4000/api/v1';

/** For server components: fetch straight from the backend with a short ISR window so
 * catalog/CMS pages stay fast and cacheable without going stale for long. */
export async function serverFetch<T>(
  path: string,
  opts: { revalidate?: number; cache?: RequestCache } = {},
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      next: opts.cache ? undefined : { revalidate: opts.revalidate ?? 60 },
      cache: opts.cache,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
