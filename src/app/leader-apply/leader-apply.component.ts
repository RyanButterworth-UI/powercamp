import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { PageGhostComponent } from '../skeleton/page-ghost.component';

@Component({
  selector: 'app-leader-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageGhostComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-4 sm:p-6 max-w-2xl page-fade-in">
      <h1 class="text-2xl font-bold mb-1" style="color: var(--color-saga-text-strong)">
        Power Camp Leader Application
      </h1>
      <p class="text-sm mb-6" style="color: var(--color-saga-text-muted)">
        Want to lead at Power Camp 2026? You'll need the leader portal password from your camp
        coordinator first.
      </p>

      @if (!unlocked()) {
        <div class="saga-card p-4 mb-4" data-testid="gate">
          <label class="block text-sm font-medium mb-2" style="color: var(--color-saga-text)">
            Leader portal password
          </label>
          <input
            type="password"
            [(ngModel)]="passwordInput"
            (keyup.enter)="checkPassword()"
            [ngModelOptions]="{ standalone: true }"
            class="w-full px-3 py-2 mb-3"
          />
          @if (gateError()) {
            <div class="text-sm mb-2" data-testid="gate-error" style="color: var(--color-saga-danger)">
              {{ gateError() }}
            </div>
          }
          <button
            type="button"
            (click)="checkPassword()"
            [disabled]="gateBusy() || !passwordInput.trim()"
            class="saga-btn saga-btn-primary"
          >
            {{ gateBusy() ? 'Checking…' : 'Continue' }}
          </button>
        </div>
      } @else if (submittedAt()) {
        <div
          class="saga-card p-4"
          data-testid="submitted"
          style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-success)">
            Application received
          </h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">
            Thanks! Your application has been recorded. Neil will review and approve leaders
            personally — you'll hear back from the camp coordinator.
          </p>
          <button type="button" (click)="goHome()" class="saga-btn saga-btn-primary">
            Done
          </button>
        </div>
      } @else if (form) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="saga-card p-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex flex-col gap-1.5 text-sm">First Name *
                <input formControlName="firstName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Last Name *
                <input formControlName="lastName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Email *
                <input type="email" formControlName="email" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Cell
                <input formControlName="cell" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Gender
                <input formControlName="gender" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Age
                <input formControlName="age" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Church
                <input formControlName="church" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">T-shirt
                <input formControlName="tshirt" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
                Why do you want to lead? Any relevant experience?
                <textarea
                  formControlName="applicationNotes"
                  rows="4"
                  class="w-full px-3 py-2"
                ></textarea>
              </label>
            </div>
          </div>

          @if (missingFields().length > 0) {
            <div
              class="saga-card p-3 text-sm"
              data-testid="missing-fields"
              style="border-color: var(--color-saga-danger); background-color: var(--color-saga-danger-soft); color: var(--color-saga-danger)"
            >
              <div class="font-semibold mb-1">Please fill in:</div>
              <ul class="list-disc list-inside">
                @for (m of missingFields(); track m) {
                  <li>{{ m }}</li>
                }
              </ul>
            </div>
          }

          @if (submitError()) {
            <div
              class="saga-card p-3 text-sm"
              data-testid="submit-error"
              style="border-color: var(--color-saga-danger); background-color: var(--color-saga-danger-soft); color: var(--color-saga-danger)"
            >
              {{ submitError() }}
            </div>
          }

          <div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button type="button" (click)="goHome()" class="saga-btn saga-btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="submitting()"
              class="saga-btn saga-btn-primary w-full sm:w-auto"
            >
              {{ submitting() ? 'Submitting…' : 'Submit application' }}
            </button>
          </div>
        </form>
      }
    </div>
    }
  `,
  styles: ``,
})
export class LeaderApplyComponent {
  passwordInput = '';
  unlocked = signal(false);
  gateBusy = signal(false);
  gateError = signal<string | null>(null);
  ready = signal(false);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
  }

  form: FormGroup | null = null;
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submittedAt = signal<string | null>(null);
  missingFields = signal<string[]>([]);

  // Friendly labels for the form's required controls — used to render
  // "Please fill in: First Name, Last Name…" when submit is attempted with
  // an invalid form.
  private readonly fieldLabels: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
  };

  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  checkPassword(): void {
    const pw = this.passwordInput.trim();
    if (!pw) return;
    this.gateBusy.set(true);
    this.gateError.set(null);
    this.http
      .post<{ ok: boolean }>(`${environment.baseApi}/leaders/check-password`, { password: pw })
      .subscribe({
        next: () => {
          this.gateBusy.set(false);
          this.unlocked.set(true);
          this.buildForm();
        },
        error: (err) => {
          this.gateBusy.set(false);
          this.gateError.set(err?.status === 401 ? 'Wrong password.' : 'Could not check the password. Try again.');
        },
      });
  }

  submit(): void {
    if (!this.form) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing: string[] = [];
      for (const [key, label] of Object.entries(this.fieldLabels)) {
        const ctrl = this.form.get(key);
        if (ctrl && ctrl.invalid) missing.push(label);
      }
      this.missingFields.set(missing.length > 0 ? missing : ['Please review the form and try again.']);
      return;
    }
    this.missingFields.set([]);
    this.submitting.set(true);
    this.submitError.set(null);

    this.http
      .post<{ id: number }>(`${environment.baseApi}/leaders/apply`, this.form.getRawValue())
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submittedAt.set(new Date().toISOString());
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set('Failed to submit. Please try again.');
        },
      });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  private buildForm(): void {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      cell: [''],
      gender: [''],
      age: [''],
      church: [''],
      tshirt: [''],
      applicationNotes: [''],
    });
  }
}
