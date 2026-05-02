import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeaderApplyComponent } from './leader-apply.component';
import { environment } from '../../environments/environment';

describe('LeaderApplyComponent', () => {
  let fixture: ComponentFixture<LeaderApplyComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LeaderApplyComponent, FormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });
    fixture = TestBed.createComponent(LeaderApplyComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows the password gate first and not the form', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="gate"]')).toBeTruthy();
    expect(fixture.componentInstance.unlocked()).toBe(false);
  });

  it('unlocks the form on a correct gate password', () => {
    fixture.componentInstance.passwordInput = 'right-pw';
    fixture.componentInstance.checkPassword();

    const req = http.expectOne(`${environment.baseApi}/leaders/check-password`);
    expect(req.request.body).toEqual({ password: 'right-pw' });
    req.flush({ ok: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.unlocked()).toBe(true);
    expect(fixture.componentInstance.form).toBeTruthy();
  });

  it('shows wrong-password error on 401', () => {
    fixture.componentInstance.passwordInput = 'bad';
    fixture.componentInstance.checkPassword();
    http.expectOne(`${environment.baseApi}/leaders/check-password`).flush(
      { error: 'Wrong password' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.unlocked()).toBe(false);
    expect(fixture.componentInstance.gateError()).toMatch(/wrong password/i);
  });

  it('POSTs the application to /leaders/apply on submit and shows the success panel', () => {
    fixture.componentInstance.passwordInput = 'right-pw';
    fixture.componentInstance.checkPassword();
    http.expectOne(`${environment.baseApi}/leaders/check-password`).flush({ ok: true });
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

    expect(fixture.componentInstance.submittedAt()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="submitted"]')).toBeTruthy();
  });
});
