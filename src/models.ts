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
  Intro = 0,
  Details = 1,
  CamperInfo = 2,
  CamperAdditionalInfo = 3,
  Friends = 4,
  Medical = 5,
  ParentInfo = 6,
  Tshirt = 7,
  Church = 8,
  OtherInfo = 9,
  CheckData = 10,
}
