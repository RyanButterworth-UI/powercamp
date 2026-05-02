import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { adminGuard } from './admin.guard';
import { AdminService } from './admin.service';

describe('adminGuard', () => {
  let routerNavigate: jest.Mock;

  beforeEach(() => {
    routerNavigate = jest.fn();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        AdminService,
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    });
  });

  it('allows navigation when an admin token is in sessionStorage', () => {
    TestBed.inject(AdminService).setToken('any.fake.token');
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBe(true);
    expect(routerNavigate).not.toHaveBeenCalled();
  });

  it('redirects to /admin/login when no token is present', () => {
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBe(false);
    expect(routerNavigate).toHaveBeenCalledWith(['/admin/login']);
  });
});
