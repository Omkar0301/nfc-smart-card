const E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-()]/g, "");
  if (E164.test(stripped)) {
    return stripped;
  }
  if (/^\d{10}$/.test(stripped)) {
    return `+91${stripped}`;
  }
  return null;
}
