import { mapCamperRow, IMPORT_2025_SOURCE } from '../lib/import-mapper';

const validRow = {
  'First Name': 'Emma',
  'LastName': 'Cable',
  'camperCell': 832876634,
  'gender': 'Female',
  'email': 'Emma.Glynis.Cable@outlook.com',
  'age': 16,
  'grade': 11,
  'Friends': 'Abigail Swanepoel, Sarah Jones',
  'medical': '',
  'parentName': 'Jillian Cable',
  'parentPhone': 828756784,
  'ParentEmail': 'JILL.CABLE@me.com',
  'church': 'Brackenhurst Baptist Church',
  'T-shirt': 'small',
  'General Info': '',
  'dob': new Date('2008-09-15T00:00:00Z'),
};

describe('mapCamperRow', () => {
  it('maps a valid row into a NewCamper insert payload tagged with year + import source', () => {
    const result = mapCamperRow(validRow, 2025);
    expect(result.skip).toBe(false);
    if (result.skip) return;

    expect(result.value).toMatchObject({
      year: 2025,
      source: IMPORT_2025_SOURCE,
      firstName: 'Emma',
      lastName: 'Cable',
      gender: 'Female',
      age: '16',
      grade: '11',
      church: 'Brackenhurst Baptist Church',
      tshirt: 'small',
    });
  });

  it('lowercases email and parentEmail', () => {
    const result = mapCamperRow(validRow, 2025);
    if (result.skip) throw new Error('expected mapped row');
    expect(result.value.email).toBe('emma.glynis.cable@outlook.com');
    expect(result.value.parentEmail).toBe('jill.cable@me.com');
  });

  it('restores leading zero on 9-digit SA phone numbers', () => {
    const result = mapCamperRow(validRow, 2025);
    if (result.skip) throw new Error('expected mapped row');
    expect(result.value.camperCell).toBe('0832876634');
    expect(result.value.parentPhone).toBe('0828756784');
  });

  it('leaves already-correct phone numbers alone', () => {
    const result = mapCamperRow(
      { ...validRow, camperCell: '0832876634', parentPhone: '0828756784' },
      2025
    );
    if (result.skip) throw new Error('expected mapped row');
    expect(result.value.camperCell).toBe('0832876634');
    expect(result.value.parentPhone).toBe('0828756784');
  });

  it('converts a Date dob to YYYY-MM-DD', () => {
    const result = mapCamperRow(validRow, 2025);
    if (result.skip) throw new Error('expected mapped row');
    expect(result.value.dob).toBe('2008-09-15');
  });

  it('splits the Friends cell on commas and trims whitespace', () => {
    const result = mapCamperRow(validRow, 2025);
    if (result.skip) throw new Error('expected mapped row');
    expect(result.value.friends).toEqual(['Abigail Swanepoel', 'Sarah Jones']);
  });

  it('returns an empty friends array when the cell is blank', () => {
    const result = mapCamperRow({ ...validRow, Friends: '' }, 2025);
    if (result.skip) throw new Error('expected mapped row');
    expect(result.value.friends).toEqual([]);
  });

  it('skips rows missing First Name', () => {
    const result = mapCamperRow({ ...validRow, 'First Name': '' }, 2025);
    expect(result).toEqual({ skip: true, reason: 'missing First Name' });
  });

  it('skips rows missing LastName', () => {
    const result = mapCamperRow({ ...validRow, LastName: '' }, 2025);
    expect(result).toEqual({ skip: true, reason: 'missing LastName' });
  });

  it('skips rows missing ParentEmail', () => {
    const result = mapCamperRow({ ...validRow, ParentEmail: '' }, 2025);
    expect(result).toEqual({ skip: true, reason: 'missing ParentEmail' });
  });

  it('handles whitespace-only fields as missing', () => {
    const result = mapCamperRow({ ...validRow, 'First Name': '   ' }, 2025);
    expect(result).toEqual({ skip: true, reason: 'missing First Name' });
  });
});
