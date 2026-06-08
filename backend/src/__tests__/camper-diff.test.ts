import { diffCamper, EDITABLE_FIELD_LABELS } from '../lib/camper-diff';

describe('diffCamper', () => {
  it('returns no changes when nothing differs', () => {
    const row = { firstName: 'Sam', grade: '7', friends: ['Jo', 'Lee'] };
    expect(diffCamper(row, { ...row })).toEqual([]);
  });

  it('reports a changed field old → new with a friendly label', () => {
    const changes = diffCamper({ grade: '7' }, { grade: '8' });
    expect(changes).toEqual([{ field: 'grade', label: 'Grade', from: '7', to: '8' }]);
  });

  it('treats null/undefined/empty/whitespace as the same (no false change)', () => {
    expect(diffCamper({ medical: null }, { medical: '' })).toEqual([]);
    expect(diffCamper({ medical: undefined }, { medical: '   ' })).toEqual([]);
  });

  it('joins friends arrays and detects a real change', () => {
    const changes = diffCamper({ friends: ['Jo'] }, { friends: ['Jo', 'Lee'] });
    expect(changes).toEqual([
      { field: 'friends', label: 'Friends', from: 'Jo', to: 'Jo, Lee' },
    ]);
  });

  it('only diffs fields present on the payload (partial edits)', () => {
    // before has a lastName, but the payload omits it → not reported.
    const changes = diffCamper(
      { firstName: 'Sam', lastName: 'Old' },
      { firstName: 'Samuel' }
    );
    expect(changes).toEqual([
      { field: 'firstName', label: 'First name', from: 'Sam', to: 'Samuel' },
    ]);
  });

  it('ignores fields outside the editable set (e.g. consent agreements)', () => {
    const changes = diffCamper(
      { consentPhoto: 'no', consentGeneral: 'no' },
      { consentPhoto: 'yes', consentGeneral: 'yes' }
    );
    expect(changes).toEqual([]);
  });

  it('detects emergency-contact and medical-aid changes (editable practical info)', () => {
    const changes = diffCamper(
      { consentEmergencyContact: '0820000000' },
      { consentEmergencyContact: '0831111111' }
    );
    expect(changes).toEqual([
      {
        field: 'consentEmergencyContact',
        label: 'Emergency contact number',
        from: '0820000000',
        to: '0831111111',
      },
    ]);
  });

  it('preserves field order from the label map', () => {
    const before = { grade: '7', firstName: 'A', tshirt: 'S' };
    const after = { grade: '8', firstName: 'B', tshirt: 'M' };
    expect(diffCamper(before, after).map((c) => c.field)).toEqual([
      'firstName',
      'grade',
      'tshirt',
    ]);
  });

  it('does not expose the six consent agreements as editable', () => {
    for (const banned of [
      'consentGeneral',
      'consentLocation',
      'consentRisk',
      'consentPowerCamp',
      'consentBehaviour',
      'consentPhoto',
      'consentDate',
    ]) {
      expect(EDITABLE_FIELD_LABELS[banned]).toBeUndefined();
    }
  });
});
