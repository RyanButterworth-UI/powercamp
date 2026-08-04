import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminFeedbackComponent } from './feedback.component';

describe('AdminFeedbackComponent', () => {
  let fixture: ComponentFixture<AdminFeedbackComponent>;
  let http: HttpTestingController;

  const entry = (over: Partial<any> = {}) => ({
    id: 1,
    year: 2026,
    camperId: 42,
    camperName: 'Timothy Cable',
    campOrganization: 5,
    spiritualInput: 5,
    activities: 4,
    facilities: 4,
    userComment: 'Loved the devotions',
    oneWord: 'Organised',
    requiresFollowUp: false,
    additionalInfo: null,
    createdAt: '2026-08-03T10:00:00.000Z',
    ...over,
  });

  function flush(opts?: { rows?: any[]; summary?: Partial<any> }) {
    const rows = opts?.rows ?? [];
    http.expectOne(`${environment.baseApi}/admin/feedback`).flush({
      year: 2026,
      total: rows.length,
      feedback: rows,
      summary: {
        campOrganization: 4.5,
        spiritualInput: 4,
        activities: 4,
        facilities: 3,
        followUpRequested: 0,
        registeredCampers: 0,
        awaiting: [],
        ...opts?.summary,
      },
    });
    fixture.detectChanges();
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AdminFeedbackComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(AdminFeedbackComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows the empty state before any feedback arrives', () => {
    flush({ rows: [] });
    expect(fixture.nativeElement.querySelector('[data-testid="feedback-empty"]')).toBeTruthy();
  });

  it('renders the category averages', () => {
    flush({ rows: [entry()] });
    const org = fixture.nativeElement.querySelector('[data-testid="avg-campOrganization"]');
    expect(org.textContent).toContain('4.5');
    const facilities = fixture.nativeElement.querySelector('[data-testid="avg-facilities"]');
    expect(facilities.textContent).toContain('3');
  });

  it('renders a row per response', () => {
    flush({ rows: [entry(), entry({ id: 2, camperName: 'Emma Cable', camperId: 43 })] });
    const rows = fixture.nativeElement.querySelectorAll('[data-testid^="feedback-row-"]');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Loved the devotions');
  });

  it('flags an unmatched name so the admin knows it is not linked to a camper', () => {
    flush({ rows: [entry({ camperId: null, camperName: 'Abigail and Joshua Calitz' })] });
    expect(fixture.nativeElement.textContent).toContain('unmatched');
  });

  it('surfaces campers who asked for follow-up in their own panel', () => {
    flush({
      rows: [entry({ requiresFollowUp: true })],
      summary: { followUpRequested: 1 },
    });
    const panel = fixture.nativeElement.querySelector('[data-testid="follow-up-panel"]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Timothy Cable');
  });

  it('hides the follow-up panel when nobody asked', () => {
    flush({ rows: [entry()] });
    expect(fixture.nativeElement.querySelector('[data-testid="follow-up-panel"]')).toBeFalsy();
  });

  it('computes the response rate against registered campers', () => {
    flush({ rows: [entry(), entry({ id: 2 })], summary: { registeredCampers: 8 } });
    expect(fixture.componentInstance.responseRate()).toBe(25);
    expect(fixture.nativeElement.textContent).toContain('25%');
  });

  it('keeps the chase list collapsed until asked for', () => {
    flush({
      rows: [entry()],
      summary: { registeredCampers: 2, awaiting: [{ id: 43, name: 'Emma Cable' }] },
    });
    expect(fixture.nativeElement.textContent).not.toContain('Emma Cable');

    fixture.nativeElement.querySelector('[data-testid="toggle-awaiting"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Emma Cable');
  });

  it('shows a load error rather than an empty page when the request fails', () => {
    http
      .expectOne(`${environment.baseApi}/admin/feedback`)
      .flush({ error: 'nope' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="load-error"]')).toBeTruthy();
  });

  it('quotes and escapes free text when building the CSV', () => {
    flush({
      rows: [entry({ userComment: 'He said "brilliant", twice', additionalInfo: 'a,b' })],
    });
    const csv = (fixture.componentInstance as any).csvCell('He said "brilliant", twice');
    expect(csv).toBe('"He said ""brilliant"", twice"');
  });
});
