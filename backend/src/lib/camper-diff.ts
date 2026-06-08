// Pure, side-effect-free diff between a camper's stored details and an edit
// payload. Used by the admin inline-edit flow to (a) decide whether anything
// actually changed before sending an email, and (b) tell the family exactly
// what changed, old → new.
//
// Deliberately knows NOTHING about the DB, HTTP, or email — it just compares
// two flat records of the editable fields. That keeps it trivially unit-
// testable and the single source of truth for "what counts as a change" and
// "what each field is called in plain English".

export interface CamperChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

// The set of fields the admin editor is allowed to touch, paired with the
// human label shown to the family. The six consent agreements + consentDate +
// consentAcceptedAt are intentionally ABSENT — they are never editable, so a
// change to them can never appear here.
export const EDITABLE_FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  dob: 'Date of birth',
  gender: 'Gender',
  age: 'Age',
  grade: 'Grade',
  email: 'Camper email',
  camperCell: 'Camper cell',
  medical: 'Medical / allergies',
  tshirt: 'T-shirt size',
  church: 'Church',
  generalInfo: 'Anything else',
  friends: 'Friends',
  parentName: 'Parent / guardian name',
  parentPhone: 'Parent / guardian phone',
  parentEmail: 'Parent / guardian email',
  consentEmergencyName: 'Emergency contact name',
  consentEmergencyContact: 'Emergency contact number',
  consentMedicalAidName: 'Medical aid name',
  consentMedicalAidNumber: 'Medical aid number',
};

// Normalise a value to the string we compare + display. Arrays (friends) join
// on ", "; null/undefined become ''. Trim so " " vs "" isn't a false change.
function display(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean).join(', ');
  return String(value).trim();
}

// Returns one entry per field whose normalised value differs. Only fields
// present in EDITABLE_FIELD_LABELS are considered, and only fields actually
// present on `after` are compared — so a partial payload only diffs what it
// carries (it never reports an absent field as "changed to empty").
export function diffCamper(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): CamperChange[] {
  const changes: CamperChange[] = [];
  for (const [field, label] of Object.entries(EDITABLE_FIELD_LABELS)) {
    if (!Object.prototype.hasOwnProperty.call(after, field)) continue;
    const from = display(before[field]);
    const to = display(after[field]);
    if (from !== to) {
      changes.push({ field, label, from, to });
    }
  }
  return changes;
}
