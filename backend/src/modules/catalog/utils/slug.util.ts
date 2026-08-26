import slugify from 'slugify';

/**
 * Generates a URL slug from `input`, appending a short base36 suffix on
 * collision until `isTaken` reports the candidate is free.
 */
export async function generateUniqueSlug(
  input: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input, { lower: true, strict: true });
  let candidate = base;
  let suffix = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await isTaken(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix.toString(36)}`;
  }
  return candidate;
}
