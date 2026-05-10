import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AdminLoginComponent } from './admin-login.component';
import { AdminService } from '../admin.service';
import { environment } from '../../../environments/environment';

describe('AdminLoginComponent', () => {
  let fixture: ComponentFixture<AdminLoginComponent>;
  let http: HttpTestingController;
  let routerNavigate: jest.Mock;

  beforeEach(() => {
    routerNavigate = jest.fn();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    });
    fixture = TestBed.createComponent(AdminLoginComponent);
    http = TestBed.inject(HttpTestingController);
    // The page holds rendering behind a 300ms ready-signal so the page-ghost
    // can flash on first paint. Flip it manually so the real form template
    // renders synchronously for assertions.
    fixture.componentInstance.ready.set(true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('does not call /admin/login when password is empty', () => {
    fixture.componentInstance.passwordControl.setValue('');
    fixture.componentInstance.login();
    http.expectNone(`${environment.baseApi}/admin/login`);
  });

  it('stores the token and navigates to /admin on success', () => {
    fixture.componentInstance.passwordControl.setValue('correct-horse');
    fixture.componentInstance.login();

    const req = http.expectOne(`${environment.baseApi}/admin/login`);
    expect(req.request.body).toEqual({ password: 'correct-horse' });
    req.flush({ token: 'fake.jwt.token' });

    expect(TestBed.inject(AdminService).getToken()).toBe('fake.jwt.token');
    expect(routerNavigate).toHaveBeenCalledWith(['/admin']);
  });

  it('shows the wrong-password error on 401', () => {
    fixture.componentInstance.passwordControl.setValue('bad');
    fixture.componentInstance.login();

    http.expectOne(`${environment.baseApi}/admin/login`).flush(
      { error: 'Wrong password' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toMatch(/wrong password/i);
    expect(fixture.nativeElement.querySelector('[data-testid="login-error"]')).toBeTruthy();
    expect(routerNavigate).not.toHaveBeenCalled();
  });
});
