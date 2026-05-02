import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-leader-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-6 max-w-2xl">
      <h1 class="text-2xl font-bold mb-1">Power Camp Leader Application</h1>
      <p class="text-sm text-gray-500 mb-6">
        Want to lead at Power Camp 2026? You'll need the leader portal password from your camp
        coordinator first.
      </p>

      @if (!unlocked()) {
        <div class="border rounded p-4 mb-4 bg-gray-50" data-testid="gate">
          <label class="block text-sm font-medium text-gray-700 mb-2">Leader portal password</label>
          <input
            type="password"
            [(ngModel)]="passwordInput"
            (keyup.enter)="checkPassword()"
            [ngModelOptions]="{ standalone: true }"
            class="border rounded px-3 py-2 w-full mb-3"
          />
          @if (gateError()) {
            <div class="text-sm text-red-700 mb-2" data-testid="gate-error">{{ gateError() }}</div>
          }
          <button
            type="button"
            (click)="checkPassword()"
            [disabled]="gateBusy() || !passwordInput.trim()"
            class="bg-green-300 text-green-900 px-4 py-2 rounded disabled:bg-gray-200 disabled:text-gray-400"
          >
            {{ gateBusy() ? 'Checking…' : 'Continue' }}
          </button>
        </div>
      } @else if (submittedAt()) {
        <div class="rounded border border-green-200 bg-green-50 p-4" data-testid="submitted">
          <h2 class="font-semibold text-green-900 mb-1">Application received</h2>
          <p class="text-sm text-green-900 mb-3">
            Thanks! Your application has been recorded. Neil will review and approve leaders
            personally — you'll hear back from the camp coordinator.
          </p>
          <button type="button" (click)="goHome()" class="px-4 py-2 rounded bg-green-300 text-green-900">
            Done
          </button>
        </div>
      } @else if (form) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col text-sm">First Name *
              <input formControlName="firstName" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Last Name *
              <input formControlName="lastName" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm col-span-2">Email *
              <input type="email" formControlName="email" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Cell
              <input formControlName="cell" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Gender
              <input formControlName="gender" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Age
              <input formControlName="age" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Church
              <input formControlName="church" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">T-shirt
              <input formControlName="tshirt" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm col-span-2">
              Why do you want to lead? Any relevant experience?
              <textarea
                formControlName="applicationNotes"
                rows="4"
                class="border rounded px-2 py-1"
              ></textarea>
            </label>
          </div>

          @if (submitError()) {
            <div class="text-sm text-red-700" data-testid="submit-error">{{ submitError() }}</div>
          }

          <div class="flex justify-end gap-2">
            <button type="button" (click)="goHome()" class="px-4 py-2 rounded border border-gray-300 text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || submitting()"
              class="px-6 py-2 rounded bg-green-300 text-green-900 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {{ submitting() ? 'Submitting…' : 'Submit application' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: ``,
})
export class LeaderApplyComponent {
  passwordInput = '';
  unlocked = signal(false);
  gateBusy = signal(false);
  gateError = signal<string | null>(null);

  form: FormGroup | null = null;
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submittedAt = signal<string | null>(null);

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
    if (!this.form || this.form.invalid) return;
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
