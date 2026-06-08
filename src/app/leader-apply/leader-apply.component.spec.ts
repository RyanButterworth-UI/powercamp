import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { LeaderApplyComponent } from './leader-apply.component';
import { environment } from '../../environments/environment';

describe('LeaderApplyComponent', () => {
  let fixture: ComponentFixture<LeaderApplyComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LeaderApplyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    });
    fixture = TestBed.createComponent(LeaderApplyComponent);
    http = TestBed.inject(HttpTestingController);
    // The component holds rendering behind a 300ms ready-signal so the
    // page-ghost can show on first paint. The setTimeout is queued in the
    // constructor — by the time we hit assertions the timer hasn't fired
    // yet. Flip the signal manually so the real template renders.
    fixture.componentInstance.ready.set(true);
    fixture.detectChanges();
    // The constructor also fires GET /public-config to pull the env-driven
    // Neil email. Flush it here so http.verify() in afterEach stays clean;
    // tests that don't care about the email default get the constructor
    // fallback ("neil.cable@wol.co.za") either way.
    http.expectOne(`${environment.baseApi}/public-config`).flush({
      leaderApplicationEmail: 'neil.cable@wol.co.za',
      campYear: 2026,
    });
  });

  afterEach(() => http.verify());

  it('starts on the screening stage with the rejection / form panels hidden', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="screening"]')).toBeTruthy();
    expect(fixture.componentInstance.stage()).toBe('screening');
    expect(fixture.componentInstance.outOfSchool()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="rejected"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="submitted"]')).toBeNull();
  });

  it('out-of-school = no jumps to the rejected stage and never POSTs', () => {
    fixture.componentInstance.setOutOfSchool(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.stage()).toBe('rejected');
    expect(fixture.nativeElement.querySelector('[data-testid="rejected"]')).toBeTruthy();
    // No HTTP traffic at all — the screening is purely client-side.
    http.verify();
  });

  it('both yes reveals the application form', () => {
    fixture.componentInstance.setOutOfSchool(true);
    fixture.componentInstance.setChurchInvolved(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.stage()).toBe('form');
    expect(fixture.componentInstance.form).toBeTruthy();
  });

  it('POSTs the application to /leaders/apply on submit and lands on the submitted stage', () => {
    fixture.componentInstance.setOutOfSchool(true);
    fixture.componentInstance.setChurchInvolved(true);
    fixture.detectChanges();

    fixture.componentInstance.form!.patchValue({
      firstName: 'Sam',
      lastName: 'Smith',
      email: 'sam@example.com',
    });
    fixture.componentInstance.submit();

    const req = http.expectOne(`${environment.baseApi}/leaders/apply`);
    expect(req.request.body.firstName).toBe('Sam');
    expect(req.request.body.email).toBe('sam@example.com');
    req.flush({ id: 11 });
    fixture.detectChanges();

    expect(fixture.componentInstance.stage()).toBe('submitted');
    expect(fixture.nativeElement.querySelector('[data-testid="submitted"]')).toBeTruthy();
  });

  it('Change-my-answer on rejection puts the screener back at the first question', () => {
    fixture.componentInstance.setOutOfSchool(false);
    fixture.componentInstance.resetScreening();
    fixture.detectChanges();
    expect(fixture.componentInstance.stage()).toBe('screening');
    expect(fixture.componentInstance.outOfSchool()).toBeNull();
  });
});
