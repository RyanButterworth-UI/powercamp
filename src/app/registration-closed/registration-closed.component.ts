import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Shown on the public registration form when an admin has closed registrations.
// New registrations are blocked (the backend also enforces this with a 403 on
// /submit), but families can still join the waiting list. Rather than a minimal
// mini-form, "Join the waiting list" now runs the FULL registration flow
// (details + consent) in waitlist mode — see FormComponent.enterWaitlistMode —
// so a family who joins is completely ready if a spot opens up.
@Component({
  selector: 'app-registration-closed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="customer-wrapper" data-testid="registration-closed">
      <h1 class="text-3xl font-bold mb-2">Registrations are closed</h1>
      <p class="text-md mb-4" style="color: var(--color-saga-text-muted)">
        Thanks for your interest in Power Camp 2026. Registration is currently full. You can still
        join the waiting list — complete the full registration (including consent) and we'll hold
        everything on file, so you're ready to go the moment a spot opens up.
      </p>

      <div
        class="rounded-lg p-3 mb-6 text-sm"
        style="background-color: var(--color-saga-primary-soft); border: 1px solid var(--color-saga-primary); color: var(--color-saga-text);"
      >
        Prefer email? Write to
        <a
          [href]="mailtoHref()"
          class="font-semibold"
          style="color: var(--color-saga-primary)"
          data-testid="waitlist-mailto"
          >{{ waitlistEmail() }}</a
        >
        and ask to be added to the waiting list.
      </div>

      <button
        type="button"
        (click)="join.emit()"
        class="saga-btn saga-btn-primary"
        data-testid="waitlist-start"
      >
        Join the waiting list
      </button>
    </div>
  `,
  styles: ``,
})
export class RegistrationClosedComponent {
  // The camp's public mailbox families are pointed at. Provided by the parent
  // (read from /registration-status) so it stays configurable.
  waitlistEmail = input<string>('powercamplife@gmail.com');
  // Emitted when the family chooses to join the waiting list — the parent
  // (FormComponent) switches the full registration form into waitlist mode.
  join = output<void>();

  mailtoHref = computed(
    () => `mailto:${this.waitlistEmail()}?subject=${encodeURIComponent('Power Camp 2026 waiting list')}`
  );
}
