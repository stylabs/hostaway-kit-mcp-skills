/**
 * Fields Hostaway stores that this kit must never return on listing,
 * reservation, or message payloads (including nested copies).
 *
 * Listing object: wifiUsername, wifiPassword, doorSecurityCode, invoicingContact*.
 * Reservation object: doorCode, doorCodeVendor, doorCodeInstruction.
 */
export const DENYLIST_FIELDS = [
  "wifiPassword",
  "wifiUsername",
  "doorSecurityCode",
  "doorCode",
  "doorCodeVendor",
  "doorCodeInstruction",
] as const;

const EXACT = new Set<string>(DENYLIST_FIELDS);

export function isDeniedField(key: string): boolean {
  if (EXACT.has(key)) return true;
  // Hostaway listing invoicing* fields are all invoicing contact fields.
  if (/^invoicing/i.test(key)) return true;
  return false;
}

export function stripSecrets<T>(value: T): T {
  return stripValue(value) as T;
}

function stripValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stripValue);
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isDeniedField(key)) continue;
    out[key] = stripValue(child);
  }
  return out;
}

const ACCESS_SECRET_FIELDS = new Set([
  "wifiPassword",
  "wifiUsername",
  "doorSecurityCode",
  "doorCode",
  "doorCodeVendor",
  "doorCodeInstruction",
]);

/** Values that must never appear in a draft. Skips short invoicing tokens like "en" / "US". */
export function collectSecretValues(value: unknown, into = new Set<string>()): Set<string> {
  if (value === null || value === undefined) return into;
  if (Array.isArray(value)) {
    for (const item of value) collectSecretValues(item, into);
    return into;
  }
  if (typeof value !== "object") return into;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (ACCESS_SECRET_FIELDS.has(key) && typeof child === "string" && child.length >= 4) {
      into.add(child);
    }
    collectSecretValues(child, into);
  }
  return into;
}

export function containsDeniedField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = containsDeniedField(item);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isDeniedField(key)) return key;
    const hit = containsDeniedField(child);
    if (hit) return hit;
  }
  return null;
}
