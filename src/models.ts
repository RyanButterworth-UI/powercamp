export interface CampFormData {
  firstName: string;
  lastName: string;
  camperCell: string;
  gender: string;
  email: string;
  age: string;
  grade: string;
  friends: string[];
  medical: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  church: string;
  tshirt: string;
  generalInfo: string;
  dob: string;
}

export enum StepKey {
  Lookup = 0,
  Intro = 1,
  CamperInfo = 3,
  CamperAdditionalInfo = 4,
  Friends = 5,
  Medical = 6,
  ParentInfo = 7,
  Tshirt = 8,
  Church = 9,
  OtherInfo = 10,
  CheckData = 11,
  CamperConsent = 14,
}

export interface LookupResult {
  id: number;
  firstName: string;
  lastName: string;
  year: number;
  parentEmailMasked: string;
  // 'camper' results get a magic-link edit; 'leader' results route back into
  // the (open) leader application, pre-filled with their name.
  kind: 'camper' | 'leader';
}
export enum consentKey {
  Intro
}
