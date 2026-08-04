import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

import { FeedbackComponent } from './feedback.component';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;
  let http: HttpTestingController;

  // The camp year is fetched on init; every test has to answer it.
  function flushConfig(campYear = 2026) {
    http.expectOne(`${environment.baseApi}/public-config`).flush({ campYear });
    fixture.detectChanges();
  }

  function fillAndSubmit(name = 'Timothy Cable') {
    component.feedback.patchValue({
      camperName: name,
      campOrganization: '5',
      spiritualInput: '5',
      activities: '4',
      facilities: '4',
      requiresFeedback: 'No',
    });
    component.onSubmit();
    return http.expectOne(`${environment.baseApi}/feedback`);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    flushConfig();
    expect(component).toBeTruthy();
  });

  it('labels the camp with the year from public-config', () => {
    flushConfig(2026);
    expect(component.campLabel()).toBe('Power Camp 2026');
  });

  it('falls back to an unlabelled camp when the config call fails', () => {
    http
      .expectOne(`${environment.baseApi}/public-config`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(component.campLabel()).toBe('Power Camp');
  });

  it("doesn't step back past the intro screen", () => {
    flushConfig();
    expect(component.currentStep()).toBe(0);
    component.previousStep();
    expect(component.currentStep()).toBe(0);
  });

  it('shows the success dialog once the feedback is accepted', () => {
    flushConfig();
    fillAndSubmit().flush({ ok: true, id: 1, camperId: 42 });

    expect(component.submissionStatus()).toBe('success');
    expect(component.showDialog()).toBe(true);
    expect(component.errorMessage()).toBe('');
  });

  it('explains the one-response-per-camper rule on a 409 instead of offering a retry', () => {
    flushConfig();
    fillAndSubmit('Timothy Cable').flush(
      { error: 'already_submitted', camperName: 'Timothy Cable' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.submissionStatus()).toBe('error');
    expect(component.showDialog()).toBe(true);
    expect(component.errorTitle()).toBe("You've already sent this");
    expect(component.errorMessage()).toContain('Timothy Cable');
    expect(component.errorMessage()).toContain('one response per camper');
    // Nothing to retry — the dismiss button says so.
    expect(component.errorDismissLabel()).toBe("We're done");
  });

  it('keeps the generic retry copy for a real failure', () => {
    flushConfig();
    fillAndSubmit().flush(
      { error: 'Failed to record feedback' },
      { status: 500, statusText: 'Server Error' }
    );

    expect(component.submissionStatus()).toBe('error');
    expect(component.errorTitle()).toBe('');
    expect(component.errorMessage()).toBe('');
    expect(component.errorDismissLabel()).toBe('');
  });
});
