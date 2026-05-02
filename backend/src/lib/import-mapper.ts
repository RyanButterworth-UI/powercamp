import type { campers } from '../db/schema';

export const IMPORT_2025_SOURCE = 'import-2025';

type NewCamper = typeof campers.$inferInsert;

export type MapResult =
  | { skip: false; value: NewCamper }
  | { skip: true; reason: string };

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// Excel stores phone numbers as numbers, dropping leading zeros.
// SA mobile numbers are 10 digits starting with 0 — restore the leading zero.
function phone(v: unknown): string {
  const raw = s(v).replace(/\s+/g, '');
  if (!raw) return '';
  if (/^[1-9]\d{8}$/.test(raw)) return '0' + raw;
  return raw;
}

function dobToISO(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().split('T')[0];
  }
  return s(v);
}

function splitFriends(v: unknown): string[] {
  const raw = s(v);
  if (!raw) return [];
  return raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
}

export function mapCamperRow(row: Record<string, unknown>, year: number): MapResult {
  const firstName = s(row['First Name']);
  const lastName = s(row['LastName'] ?? row['Last Name']);
  const parentEmail = s(row['ParentEmail'] ?? row['parentEmail']).toLowerCase();

  if (!firstName) return { skip: true, reason: 'missing First Name' };
  if (!lastName) return { skip: true, reason: 'missing LastName' };
  if (!parentEmail) return { skip: true, reason: 'missing ParentEmail' };

  const email = s(row['email']).toLowerCase();

  return {
    skip: false,
    value: {
      year,
      source: IMPORT_2025_SOURCE,
      firstName,
      lastName,
      camperCell: phone(row['camperCell']) || undefined,
      gender: s(row['gender']) || undefined,
      email: email || undefined,
      age: s(row['age']) || undefined,
      grade: s(row['grade']) || undefined,
      friends: splitFriends(row['Friends']),
      medical: s(row['medical']) || undefined,
      parentName: s(row['parentName']) || undefined,
      parentPhone: phone(row['parentPhone']) || undefined,
      parentEmail,
      church: s(row['church']) || undefined,
      tshirt: s(row['T-shirt']) || undefined,
      generalInfo: s(row['General Info']) || undefined,
      dob: dobToISO(row['dob']) || undefined,
    },
  };
}
