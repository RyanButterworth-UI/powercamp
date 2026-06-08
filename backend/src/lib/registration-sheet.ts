// Single source of truth for the Registrations sheet row layout. Both the new
// registration (/submit) and the edit (/update) paths build their row through
// this function so the two can never drift out of column alignment — a drift
// would mean an edit overwrites the wrong columns of an existing row.
//
// Column order (0-based):
//   A0  firstName            I8  medical            Q16 consent ('TRUE')
//   B1  lastName             J9  parentName         R17 camper id (key)
//   C2  camperCell           K10 parentPhone        S18 emergency name
//   D3  gender               L11 parentEmail        T19 emergency number
//   E4  email                M12 church             U20 medical aid name
//   F5  age                  N13 tshirt             V21 medical aid number
//   G6  grade                O14 generalInfo        W22 consent date
//   H7  friends (joined)     P15 dob                X23 year

export interface CamperSheetFields {
  firstName: string;
  lastName: string;
  camperCell?: string;
  gender?: string;
  email?: string;
  age?: string;
  grade?: string;
  friends?: string[];
  medical?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  church?: string;
  tshirt?: string;
  generalInfo?: string;
  dob?: string;
}

export interface ConsentSheetFields {
  emergencyName?: string;
  emergencyContact?: string;
  medicalAidName?: string;
  medicalAidNumber?: string;
  date?: string;
}

// Primary upsert key for the edit flow: the stable camper id (col R / index 17).
export const REGISTRATION_SHEET_KEY = [17];
// Fallback for legacy rows written before the id column existed:
// firstName + lastName + parentEmail.
export const REGISTRATION_SHEET_FALLBACK_KEY = [0, 1, 11];

export function registrationSheetRow(
  c: CamperSheetFields,
  consent: ConsentSheetFields,
  id: number,
  year: number
): (string | number | null)[] {
  return [
    c.firstName,                  // A
    c.lastName,                   // B
    c.camperCell ?? '',           // C
    c.gender ?? '',               // D
    c.email ?? '',                // E
    c.age ?? '',                  // F
    c.grade ?? '',                // G
    (c.friends ?? []).join(', '), // H
    c.medical ?? '',              // I
    c.parentName ?? '',           // J
    c.parentPhone ?? '',          // K
    c.parentEmail ?? '',          // L
    c.church ?? '',               // M
    c.tshirt ?? '',               // N
    c.generalInfo ?? '',          // O
    c.dob ?? '',                  // P
    'TRUE',                       // Q — consent accepted (gated before submit)
    id,                           // R — stable upsert key
    consent.emergencyName ?? '',     // S
    consent.emergencyContact ?? '',  // T
    consent.medicalAidName ?? '',    // U
    consent.medicalAidNumber ?? '',  // V
    consent.date ?? '',              // W
    year,                            // X
  ];
}
