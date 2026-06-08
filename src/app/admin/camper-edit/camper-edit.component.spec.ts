import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CamperEditComponent } from './camper-edit.component';
import { AdminCamper, CamperEditPayload } from '../admin.service';

function makeCamper(overrides: Partial<AdminCamper> = {}): AdminCamper {
  return {
    id: 7,
    year: 2026,
    firstName: 'Sam',
    lastName: 'Stone',
    dob: '2012-05-01',
    gender: 'Male',
    age: '13',
    grade: '7',
    email: 'sam@example.test',
    camperCell: '0820000000',
    medical: 'None',
    tshirt: 'S',
    church: 'Hope',
    generalInfo: '',
    friends: ['Jo', 'Lee'],
    parentName: 'Pat Stone',
    parentPhone: '0830000000',
    parentEmail: 'pat@example.test',
    source: 'web',
    consentGeneral: 'yes',
    consentLocation: 'yes',
    consentRisk: 'yes',
    consentPowerCamp: 'yes',
    consentBehaviour: 'yes',
    consentPhoto: 'yes',
    consentEmergencyName: 'Gran',
    consentEmergencyContact: '0840000000',
    consentMedicalAidName: 'Disco',
    consentMedicalAidNumber: '12345',
    consentDate: '2026-01-01',
    consentAcceptedAt: '2026-01-01T00:00:00.000Z',
    paymentReceivedAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('CamperEditComponent', () => {
  let fixture: ComponentFixture<CamperEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CamperEditComponent] });
    fixture = TestBed.createComponent(CamperEditComponent);
  });

  function setCamper(c: AdminCamper | null) {
    fixture.componentRef.setInput('camper', c);
    fixture.detectChanges();
  }

  it('renders nothing until a camper is provided', () => {
    setCamper(null);
    expect(fixture.nativeElement.querySelector('[data-testid="camper-edit-panel"]')).toBeNull();
  });

  it('pre-populates the form from the camper, joining friends with commas', () => {
    setCamper(makeCamper());
    const form = fixture.componentInstance.form;
    expect(form.get('firstName')!.value).toBe('Sam');
    expect(form.get('parentEmail')!.value).toBe('pat@example.test');
    expect(form.get('friends')!.value).toBe('Jo, Lee');
  });

  it('does NOT render the six consent agreements or consent date', () => {
    setCamper(makeCamper());
    const f = fixture.componentInstance.form;
    for (const banned of [
      'consentGeneral',
      'consentLocation',
      'consentRisk',
      'consentPowerCamp',
      'consentBehaviour',
      'consentPhoto',
      'consentDate',
    ]) {
      expect(f.get(banned)).toBeNull();
    }
  });

  it('does not emit and marks invalid when required fields are blank', () => {
    setCamper(makeCamper());
    const spy = jest.fn();
    fixture.componentInstance.submitForm.subscribe(spy);
    fixture.componentInstance.form.patchValue({ firstName: '', parentEmail: 'bad' });
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('emits a normalised payload: trimmed, lowercased emails, friends split, blanks dropped', () => {
    setCamper(makeCamper());
    let emitted: CamperEditPayload | undefined;
    fixture.componentInstance.submitForm.subscribe((p) => (emitted = p));

    fixture.componentInstance.form.patchValue({
      firstName: '  Samuel ',
      parentEmail: 'NewParent@Example.test',
      email: '  ',
      grade: '8',
      friends: 'Jo,  Lee , ',
      medical: '',
    });
    fixture.componentInstance.onSubmit();

    expect(emitted).toBeDefined();
    expect(emitted!.firstName).toBe('Samuel');
    expect(emitted!.parentEmail).toBe('newparent@example.test');
    expect(emitted!.email).toBeUndefined(); // blank → omitted
    expect(emitted!.medical).toBeUndefined();
    expect(emitted!.grade).toBe('8');
    expect(emitted!.friends).toEqual(['Jo', 'Lee']);
  });

  it('emits cancel when the backdrop or cancel button is used', () => {
    setCamper(makeCamper());
    const spy = jest.fn();
    fixture.componentInstance.cancel.subscribe(spy);
    fixture.nativeElement.querySelector('[data-testid="camper-edit-cancel"]').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
