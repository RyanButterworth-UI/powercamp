import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { VerifyLinkComponent } from './verify-link.component';
import { environment } from '../../environments/environment';

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

  it('shows the verified panel with the camper name on a 200 response', () => {
    const fixture = createFixture('a-valid-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = http.expectOne(`${environment.baseApi}/verify-link`);
    expect(req.request.body).toEqual({ token: 'a-valid-token' });
    req.flush({
      camper: {
        id: 7,
        year: 2025,
        firstName: 'Ryan',
        lastName: 'Butterworth',
        email: 'r@e.com',
        parentEmail: 'r@e.com',
        parentName: 'Test',
        grade: '11',
        church: 'Test Church',
      },
    });
    fixture.detectChanges();

    const verified = fixture.nativeElement.querySelector('[data-testid="verified"]');
    expect(verified).toBeTruthy();
    expect(verified.textContent).toContain('Ryan');
    expect(verified.textContent).toContain('Butterworth');
    expect(verified.textContent).toContain('2025');

    http.verify();
  });

  it('shows the expired-link error for 401', () => {
    const fixture = createFixture('expired-token');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(`${environment.baseApi}/verify-link`).flush(
      { error: 'Invalid or expired link' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    const err = fixture.nativeElement.querySelector('[data-testid="error"]');
    expect(err).toBeTruthy();
    expect(err.textContent).toMatch(/expired/i);

    http.verify();
  });

  it('shows the missing-token error when the URL has no token', () => {
    const fixture = createFixture(null);
    fixture.detectChanges();

    const err = fixture.nativeElement.querySelector('[data-testid="error"]');
    expect(err).toBeTruthy();
    expect(err.textContent).toMatch(/no token/i);
  });
});
