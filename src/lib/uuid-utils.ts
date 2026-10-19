/**
 * UUID Utility to guarantee 100% compatibility between Google numeric IDs,
 * arbitrary strings, and PostgreSQL UUID / TEXT columns.
 */

export function isValidUuid(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Deterministically converts any string or numeric Google ID (e.g. "107573435679269107190")
 * into a valid RFC4122 UUID v4 format.
 */
export function toValidUuid(id: string | null | undefined): string {
  if (!id) return '00000000-0000-4000-8000-000000000001';
  const clean = String(id).trim();
  if (isValidUuid(clean)) return clean.toLowerCase();

  // FNV-1a hash to convert arbitrary numeric ID into 128-bit hex
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x5bd1e995;
  let h4 = 0x27d4eb2d;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code << 3), 0x5bd1e995);
    h3 = Math.imul(h3 ^ (code << 5), 0x27d4eb2d);
    h4 = Math.imul(h4 ^ (code >> 2), 0x811c9dc5);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0').slice(0, 4);
  const p3 = '4' + (h3 >>> 0).toString(16).padStart(8, '0').slice(0, 3);
  const p4 = '8' + (h4 >>> 0).toString(16).padStart(8, '0').slice(0, 3);
  const p5 =
    ((h1 ^ h3) >>> 0).toString(16).padStart(8, '0') +
    ((h2 ^ h4) >>> 0).toString(16).padStart(8, '0').slice(0, 4);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}

/**
 * Returns a guaranteed valid UUID regardless of whether the input is already a UUID or a Google sub
 */
export function safeUserId(id: string | null | undefined): string {
  return toValidUuid(id);
}

