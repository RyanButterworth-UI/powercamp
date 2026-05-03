import { Routes } from '@angular/router';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./form/form.component').then((m) => m.FormComponent),
  },
  {
    path: 'consent',
    loadComponent: () =>
      import('./consent/consent.component').then((m) => m.ConsentComponent),
  },
  {
    path: 'feedback',
    loadComponent: () =>
      import('./feedback/feedback.component').then((m) => m.FeedbackComponent),
  },
  {
    path: 'verify-link',
    loadComponent: () =>
      import('./verify-link/verify-link.component').then((m) => m.VerifyLinkComponent),
  },
  {
    path: 'info',
    loadComponent: () =>
      import('./info/info.component').then((m) => m.InfoComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/admin-login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/leaders',
    loadComponent: () =>
      import('./admin/admin-leaders/admin-leaders.component').then((m) => m.AdminLeadersComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'leader-apply',
    loadComponent: () =>
      import('./leader-apply/leader-apply.component').then((m) => m.LeaderApplyComponent),
  },
  {
    path: '**',
    redirectTo: '', // fallback to main form if unknown URL
  },
];
