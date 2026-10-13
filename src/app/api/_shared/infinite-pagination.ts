/** Normalizes an untrusted page query parameter to a positive integer. */
export function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Returns tenant-sensitive JSON without allowing browser or shared caching. */
export function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}
