import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from './admin.service';

export const adminGuard: CanActivateFn = () => {
  const admin = inject(AdminService);
  const router = inject(Router);
  if (admin.getToken()) return true;
  router.navigate(['/admin/login']);
  return false;
};
