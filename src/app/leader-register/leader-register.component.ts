import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { PageGhostComponent } from '../skeleton/page-ghost.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

interface InvitedLeader {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cell: string | null;
  gender: string | null;
  age: string | null;
  church: string | null;
  tshirt: string | null;
}

@Component({
  selector: 'app-leader-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageGhostComponent, SkeletonComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-4 sm:p-6 max-w-2xl page-fade-in">
      @if (verifying()) {
        <div class="saga-card p-4">
          <app-skeleton width="40%" height="20px" />
          <div class="mt-2"><app-skeleton width="80%" height="14px" /></div>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <app-skeleton shape="block" height="38px" />
            <app-skeleton shape="block" height="38px" />
            <app-skeleton shape="block" height="38px" />
            <app-skeleton shape="block" height="38px" />
          </div>
          <p class="text-xs mt-3" style="color: var(--color-saga-text-muted)">
            Verifying your invite link…
          </p>
        </div>
      } @else if (verifyError()) {
        <div
          class="saga-card p-4"
          data-testid="invite-error"
          style="border-color: var(--color-saga-danger); background-color: var(--color-saga-danger-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-danger)">
            Invite link is no longer valid
          </h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">{{ verifyError() }}</p>
          <button type="button" (click)="goHome()" class="saga-btn saga-btn-secondary">
            Back to home
          </button>
        </div>
      } @else if (submittedAt()) {
        <div
          class="saga-card p-4"
          data-testid="invite-submitted"
          style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-success)">
            Registration complete
          </h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">
            Thanks {{ leader()?.firstName }} — see you at camp! Neil has the rest of your details
            and will be in touch with logistics closer to the date.
          </p>
          <button type="button" (click)="goHome()" class="saga-btn saga-btn-primary">
            Done
          </button>
        </div>
      } @else if (form && leader()) {
        <h2 class="text-xl font-bold mb-1" style="color: var(--color-saga-text-strong)">
          Welcome, {{ leader()!.firstName }} {{ leader()!.lastName }}
        </h2>
        <p class="text-sm mb-6" style="color: var(--color-saga-text-muted)">
          Your application was approved. Fill in the rest below to lock in your spot for Power Camp 2026.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="saga-card p-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label class="flex flex-col gap-1.5 text-sm">Emergency contact name
                <input formControlName="parentName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Emergency contact number
                <input formControlName="parentPhone" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Emergency contact email
                <input type="email" formControlName="parentEmail" class="w-full px-3 py-2" />
              </label>
            </div>
          </div>

          @if (submitError()) {
            <div
              class="saga-card p-3 text-sm"
              data-testid="invite-submit-error"
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
              {{ submitting() ? 'Saving…' : 'Confirm my registration' }}
            </button>
          </div>
        </form>
      }
    </div>
    }
  `,
})
export class LeaderRegisterComponent {
  ready = signal(false);
  verifying = signal(true);
  verifyError = signal<string | null>(null);
  leader = signal<InvitedLeader | null>(null);
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submittedAt = signal<string | null>(null);
  form: FormGroup | null = null;

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private token: string | null = null;

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.verifying.set(false);
      this.verifyError.set('No invite token in the URL — open this page from the invite email.');
      return;
    }

    this.http
      .post<{ leader: InvitedLeader }>(`${environment.baseApi}/leaders/verify-invite`, { token: this.token })
      .subscribe({
        next: (res) => {
          this.leader.set(res.leader);
          this.buildForm(res.leader);
          this.verifying.set(false);
        },
        error: (err) => {
          this.verifying.set(false);
          if (err?.status === 401) {
            this.verifyError.set('This invite link is invalid or has expired. Ask Neil to send a new one.');
          } else if (err?.status === 403) {
            this.verifyError.set("Your application isn't approved yet. Reach out to Neil if this looks wrong.");
          } else if (err?.status === 404) {
            this.verifyError.set("We couldn't find your application — it may have been removed.");
          } else {
            this.verifyError.set('Something went wrong verifying the link. Please try again.');
          }
        },
      });
  }

  private buildForm(l: InvitedLeader): void {
    this.form = this.fb.group({
      cell: [l.cell ?? ''],
      gender: [l.gender ?? ''],
      age: [l.age ?? ''],
      church: [l.church ?? ''],
      tshirt: [l.tshirt ?? ''],
      parentName: [''],
      parentPhone: [''],
      parentEmail: [''],
    });
  }

  submit(): void {
    if (!this.form || !this.token) return;
    this.submitting.set(true);
    this.submitError.set(null);

    this.http
      .post<{ id: number }>(`${environment.baseApi}/leaders/register`, {
        token: this.token,
        ...this.form.getRawValue(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submittedAt.set(new Date().toISOString());
        },
        error: (err) => {
          this.submitting.set(false);
          if (err?.status === 401) {
            this.submitError.set('Your invite expired before you could finish. Ask Neil to send a new one.');
          } else {
            this.submitError.set('Something went wrong saving your registration. Please try again.');
          }
        },
      });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
