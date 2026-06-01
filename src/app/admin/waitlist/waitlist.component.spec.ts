import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminWaitlistComponent } from './waitlist.component';

describe('AdminWaitlistComponent', () => {
  let fixture: ComponentFixture<AdminWaitlistComponent>;
  let http: HttpTestingController;

  function flushInitial(opts?: { open?: boolean; rows?: any[] }) {
    http
      .expectOne(`${environment.baseApi}/admin/registration-status`)
      .flush({ registrationsOpen: opts?.open ?? true });
    http
      .expectOne(`${environment.baseApi}/admin/waitlist`)
      .flush({ total: (opts?.rows ?? []).length, waitlist: opts?.rows ?? [] });
    fixture.detectChanges();
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AdminWaitlistComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(AdminWaitlistComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the registration status and renders the open state', () => {
    flushInitial({ open: true });
    expect(fixture.componentInstance.registrationsOpen()).toBe(true);
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="registration-toggle-btn"]'
    );
    expect(btn.textContent).toContain('Close registrations');
  });

  it('shows the empty state when no one is waiting', () => {
    flushInitial({ rows: [] });
    expect(fixture.nativeElement.querySelector('[data-testid="waitlist-empty"]')).toBeTruthy();
  });

  it('renders a row per waiting-list entry', () => {
    flushInitial({
      rows: [
        {
          id: 1,
          year: 2026,
          camperName: 'Sam Smith',
          parentName: 'Pat Smith',
          parentEmail: 'pat@example.com',
          phone: '0821234567',
          grade: '9',
          note: 'thanks',
          status: 'waiting',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    });
    const rows = fixture.nativeElement.querySelectorAll('[data-testid^="waitlist-row-"]');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Sam Smith');
  });

  it('toggles registrations closed via POST and reflects the new state', () => {
    flushInitial({ open: true });
    fixture.componentInstance.toggleRegistrations();
    const req = http.expectOne(`${environment.baseApi}/admin/registration-status`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ open: false });
    req.flush({ registrationsOpen: false });
    fixture.detectChanges();
    expect(fixture.componentInstance.registrationsOpen()).toBe(false);
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="registration-toggle-btn"]'
    );
    expect(btn.textContent).toContain('Open registrations');
  });
});
