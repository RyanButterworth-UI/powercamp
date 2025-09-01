import { Routes } from '@angular/router';

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
    path: '**',
    redirectTo: '', // fallback to main form if unknown URL
  },
];
