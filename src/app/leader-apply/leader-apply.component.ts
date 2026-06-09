import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Leadership for Power Camp 2026 is full of great candidates, so the public
// leader application has been retired. This route is kept (rather than removed)
// so any bookmarked or emailed /leader-apply links land on a friendly "we're
// full" message instead of the 404 fallback. The backend POST /leaders/apply is
// closed in parallel (env LEADER_APPLICATIONS_OPEN), and the invite-only
// completion flow lives on /leader-register — untouched by this.
@Component({
  selector: 'app-leader-apply',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-4 sm:p-6 max-w-2xl page-fade-in">
      <h1 class="text-2xl font-bold mb-1" style="color: var(--color-saga-text-strong)">
        Power Camp Leadership
      </h1>
      <p class="text-sm mb-6" style="color: var(--color-saga-text-muted)">
        About leading at Power Camp 2026.
      </p>

      <div
        class="saga-card p-5"
        data-testid="leadership-full"
        style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
      >
        <h2 class="font-semibold mb-2" style="color: var(--color-saga-success)">
          Leadership is full for 2026
        </h2>
        <p class="text-sm mb-3" style="color: var(--color-saga-text)">
          Thank you — the response has been incredible! Our leadership team for Power Camp 2026 is
          now full of brilliant, capable leaders, so we've closed leader applications for this year.
        </p>
        <p class="text-sm mb-4" style="color: var(--color-saga-text-muted)">
          If you'd still love to be part of the team in future, drop us a line at
          <a
            href="mailto:powercamplife@gmail.com"
            class="underline"
            style="color: var(--color-saga-action)"
          >powercamplife&#64;gmail.com</a>
          and we'll keep you in mind.
        </p>
        <button type="button" (click)="goHome()" class="saga-btn saga-btn-primary">
          Back to Home
        </button>
      </div>
    </div>
  `,
})
export class LeaderApplyComponent {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }
}
