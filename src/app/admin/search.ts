/**
 * Flattens a row into one lowercase haystack for free-text search.
 *
 * Every string field (and every string in an array field, e.g. a camper's
 * friends) is included, so "search any field" means exactly that — searching
 * an email, a phone number or a church name all work without maintaining a
 * list of searchable columns that drifts out of date as columns are added.
 */
export function searchableHay(row: object): string {
  const parts: string[] = [];
  for (const v of Object.values(row) as unknown[]) {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) parts.push(v.join(' '));
  }
  return parts.join(' ').toLowerCase();
}
