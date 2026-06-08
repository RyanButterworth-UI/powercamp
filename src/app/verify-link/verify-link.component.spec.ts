import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { VerifyLinkComponent } from './verify-link.component';
import { environment } from '../../environments/environment';

const mockCamper = {
  id: 7,
  year: 2025,
  firstName: 'Ryan',
  lastName: 'Butterworth',
  email: 'r@e.com',
  camperCell: '0820000001',
  gender: 'Male',
  age: '16',
  grade: '11',
  friends: [],
  medical: '',
  parentName: 'Test Parent',
  parentPhone: '0820000000',
  parentEmail: 'r@e.com',
  church: 'Test Church',
  tshirt: 'M',
  generalInfo: '',
  dob: '2009-01-01',
};

function createFixture(token: string | null): ComponentFixture<VerifyLinkComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [VerifyLinkComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
      },
      { provide: Router, useValue: { navigate: jest.fn() } },
    ],
  });
  return TestBed.createComponent(VerifyLinkComponent);
}

describe('VerifyLinkComponent', () => {
  it('shows the verifying state while the request is in flight', () => {
    const fixture = createFixture('a-valid-token');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="verifying"]')).toBeTruthy();
  });

  it('builds the prefilled form on a successful verify response', () => {
    const fixture = createFixture('a-valid-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(`${environment.baseApi}/verify-link`).flush({ camper: mockCamper });
    fixture.detectChanges();

    const camperGroup = fixture.componentInstance.form?.get('camper');
    expect(camperGroup?.get('firstName')?.value).toBe('Ryan');
    expect(camperGroup?.get('parentEmail')?.value).toBe('r@e.com');
    http.verify();
  });

  it('shows the expired-link error for 401', () => {
    const fixture = createFixture('expired-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(`${environment.baseApi}/verify-link`).flush(
      { error: 'expired' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="error"]').textContent).toMatch(/expired/i);
    http.verify();
  });

  it('shows the missing-token error when the URL has no token', () => {
    const fixture = createFixture(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="error"]').textContent).toMatch(/no token/i);
  });

  it('blocks submit until all consent checkboxes are checked', () => {
    const fixture = createFixture('a-valid-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.baseApi}/verify-link`).flush({ camper: mockCamper });
    fixture.detectChanges();

    const consent = fixture.componentInstance.form!.get('consent')!;
    consent.patchValue({
      emergencyName: 'X',
      emergencyContact: '0820000099',
      medicalAidName: 'NONE',
      medicalAidNumber: 'NONE',
      date: '2026-05-02',
    });
    expect(fixture.componentInstance.form!.invalid).toBe(true);

    consent.patchValue({
      general: true,
      location: true,
      risk: true,
      powerCamp: true,
      behaviour: true,
      photo: true,
    });
    expect(fixture.componentInstance.form!.invalid).toBe(false);
    http.verify();
  });

  it('POSTs to /update with the token and maps consent booleans to "accept"', () => {
    const fixture = createFixture('a-valid-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.baseApi}/verify-link`).flush({ camper: mockCamper });
    fixture.detectChanges();

    const consent = fixture.componentInstance.form!.get('consent')!;
    consent.patchValue({
      general: true, location: true, risk: true,
      powerCamp: true, behaviour: true, photo: true,
      emergencyName: 'X', emergencyContact: '0820000099',
      medicalAidName: 'NONE', medicalAidNumber: 'NONE',
      date: '2026-05-02',
    });

    fixture.componentInstance.submit();
    const req = http.expectOne(`${environment.baseApi}/update`);
    expect(req.request.body.token).toBe('a-valid-token');
    expect(req.request.body.consent.general).toBe('accept');
    expect(req.request.body.consent.photo).toBe('accept');
    expect(req.request.body.camper.firstName).toBe('Ryan');

    req.flush({ id: 7, consentAcceptedAt: '2026-05-02T10:00:00.000Z' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="submitted"]')).toBeTruthy();
    http.verify();
  });

  it('clears any stale main-form draft from localStorage after a successful edit submit', () => {
    // Reproduces the "edit created a new camper / landed on T-shirt" bug:
    // a leftover new-registration draft must not survive an edit, or tapping
    // "Done" returns to the main form which auto-resumes it mid-flow.
    localStorage.setItem('powercamp.form.draft', JSON.stringify({ firstName: 'Lexi' }));

    const fixture = createFixture('a-valid-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.baseApi}/verify-link`).flush({ camper: mockCamper });
    fixture.detectChanges();

    const consent = fixture.componentInstance.form!.get('consent')!;
    consent.patchValue({
      general: true, location: true, risk: true,
      powerCamp: true, behaviour: true, photo: true,
      emergencyName: 'X', emergencyContact: '0820000099',
      medicalAidName: 'NONE', medicalAidNumber: 'NONE',
      date: '2026-05-02',
    });

    fixture.componentInstance.submit();
    http
      .expectOne(`${environment.baseApi}/update`)
      .flush({ id: 7, consentAcceptedAt: '2026-05-02T10:00:00.000Z' });
    fixture.detectChanges();

    expect(localStorage.getItem('powercamp.form.draft')).toBeNull();
    http.verify();
  });

  it('shows the review/summary screen before submitting and confirms from there', () => {
    const fixture = createFixture('a-valid-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.baseApi}/verify-link`).flush({ camper: mockCamper });
    fixture.detectChanges();

    const consent = fixture.componentInstance.form!.get('consent')!;
    consent.patchValue({
      general: true, location: true, risk: true,
      powerCamp: true, behaviour: true, photo: true,
      emergencyName: 'X', emergencyContact: '0820000099',
      medicalAidName: 'NONE', medicalAidNumber: 'NONE',
      date: '2026-05-02',
    });

    // Review first — no network call yet, just the summary screen.
    fixture.componentInstance.review();
    fixture.detectChanges();
    expect(fixture.componentInstance.reviewing()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="edit-review"]')).toBeTruthy();
    http.expectNone(`${environment.baseApi}/update`);

    // Confirm from the review screen → POST.
    fixture.componentInstance.submit();
    const req = http.expectOne(`${environment.baseApi}/update`);
    req.flush({ id: 7, consentAcceptedAt: '2026-05-02T10:00:00.000Z' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="submitted"]')).toBeTruthy();
    http.verify();
  });
});
