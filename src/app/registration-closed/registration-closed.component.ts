import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

// Shown on the public registration form when an admin has closed
// registrations. New registrations are blocked (the backend also enforces
// this with a 403 on /submit), but families can still ask to join the
// waiting list — either by emailing the camp, or via the inline form which
// posts to /waitlist and notifies the organisers.
@Component({
  selector: 'app-registration-closed',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="customer-wrapper" data-testid="registration-closed">
      <h1 class="text-3xl font-bold mb-2">Registrations are closed</h1>
      <p class="text-md mb-4" style="color: var(--color-saga-text-muted)">
        Thanks for your interest in Power Camp 2026. Registration is currently closed —
        we may have reached capacity. You can still join the waiting list, and we'll be in
        touch if a spot opens up.
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

      @if (done()) {
        <div
          class="saga-card p-4"
          data-testid="waitlist-success"
          style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-success)">
            You're on the list
          </h2>
          <p class="text-sm" style="color: var(--color-saga-text)">
            Thanks! We've added {{ form.get('camperName')?.value }} to the waiting list and the
            organisers have been notified. We'll reach out at
            <span class="font-mono">{{ form.get('parentEmail')?.value }}</span> if a place opens up.
          </p>
        </div>
      } @else {
        <h2 class="text-lg font-semibold mb-3">Or join the waiting list here</h2>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3">
          <label class="flex flex-col text-sm gap-1.5">Camper's full name *
            <input formControlName="camperName" class="w-full rounded-md px-3 py-2" />
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex flex-col text-sm gap-1.5">Grade
              <input formControlName="grade" class="w-full rounded-md px-3 py-2" />
            </label>
            <label class="flex flex-col text-sm gap-1.5">Parent / guardian name
              <input formControlName="parentName" class="w-full rounded-md px-3 py-2" />
            </label>
            <label class="flex flex-col text-sm gap-1.5">Parent email *
              <input formControlName="parentEmail" type="email" class="w-full rounded-md px-3 py-2" />
            </label>
            <label class="flex flex-col text-sm gap-1.5">Contact number
              <input formControlName="phone" type="tel" class="w-full rounded-md px-3 py-2" />
            </label>
          </div>
          <label class="flex flex-col text-sm gap-1.5">Anything we should know?
            <input formControlName="note" class="w-full rounded-md px-3 py-2" />
          </label>

          @if (error()) {
            <div
              class="saga-card p-3 text-sm"
              data-testid="waitlist-error"
              style="border-color: var(--color-saga-danger); background-color: var(--color-saga-danger-soft); color: var(--color-saga-danger)"
            >
              {{ error() }}
            </div>
          }

          <div>
            <button
              type="submit"
              [disabled]="form.invalid || submitting()"
              class="saga-btn saga-btn-primary"
              data-testid="waitlist-submit"
            >
              {{ submitting() ? 'Adding…' : 'Join the waiting list' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: ``,
})
export class RegistrationClosedComponent {
  // The camp's public mailbox families are pointed at. Provided by the
  // parent (read from /registration-status) so it stays configurable.
  waitlistEmail = input<string>('powercamplife@gmail.com');

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  submitting = signal(false);
  done = signal(false);
  error = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    camperName: ['', Validators.required],
    grade: [''],
    parentName: [''],
    parentEmail: ['', [Validators.required, Validators.email]],
    phone: [''],
    note: [''],
  });

  mailtoHref = computed(
    () => `mailto:${this.waitlistEmail()}?subject=${encodeURIComponent('Power Camp 2026 waiting list')}`
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.http.post(`${environment.baseApi}/waitlist`, this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Sorry — something went wrong. Please email us instead.');
      },
    });
  }
}
