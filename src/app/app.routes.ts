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
    path: 'unsubscribe',
    loadComponent: () =>
      import('./unsubscribe/unsubscribe.component').then((m) => m.UnsubscribeComponent),
  },
  {
    path: 'info',
    loadComponent: () =>
      import('./info/info.component').then((m) => m.InfoComponent),
  },
  {
    path: 'kit-list',
    loadComponent: () =>
      import('./kit-list/kit-list.component').then((m) => m.KitListComponent),
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
    path: 'admin/bulk-email',
    loadComponent: () =>
      import('./admin/bulk-email/bulk-email.component').then((m) => m.BulkEmailComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/teams',
    loadComponent: () =>
      import('./admin/teams/teams.component').then((m) => m.TeamsComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/bunks',
    loadComponent: () =>
      import('./admin/bunks/bunks.component').then((m) => m.BunksComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/waitlist',
    loadComponent: () =>
      import('./admin/waitlist/waitlist.component').then((m) => m.AdminWaitlistComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'leader-apply',
    loadComponent: () =>
      import('./leader-apply/leader-apply.component').then((m) => m.LeaderApplyComponent),
  },
  {
    path: 'leader-register',
    loadComponent: () =>
      import('./leader-register/leader-register.component').then((m) => m.LeaderRegisterComponent),
  },
  {
    path: '**',
    redirectTo: '', // fallback to main form if unknown URL
  },
];
