import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { RegistrationClosedComponent } from './registration-closed.component';

describe('RegistrationClosedComponent', () => {
  let fixture: ComponentFixture<RegistrationClosedComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegistrationClosedComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(RegistrationClosedComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('waitlistEmail', 'hello@powercamp.test');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders the closed message and a mailto link to the waiting-list address', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="waitlist-mailto"]'
    );
    expect(link.getAttribute('href')).toContain('mailto:hello@powercamp.test');
    expect(fixture.nativeElement.textContent).toContain('Registrations are closed');
  });

  it('disables submit until camper name and a valid parent email are present', () => {
    const c = fixture.componentInstance;
    expect(c.form.invalid).toBe(true);
    c.form.patchValue({ camperName: 'Sam', parentEmail: 'pat@example.com' });
    expect(c.form.valid).toBe(true);
  });

  it('POSTs to /waitlist and shows the success state', () => {
    const c = fixture.componentInstance;
    c.form.patchValue({ camperName: 'Sam', parentEmail: 'pat@example.com' });
    c.submit();
    const req = http.expectOne(`${environment.baseApi}/waitlist`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(
      expect.objectContaining({ camperName: 'Sam', parentEmail: 'pat@example.com' })
    );
    req.flush({ id: 1, ok: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="waitlist-success"]')).toBeTruthy();
  });
});
