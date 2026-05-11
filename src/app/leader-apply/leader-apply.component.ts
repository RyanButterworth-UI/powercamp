import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { PageGhostComponent } from '../skeleton/page-ghost.component';

// Three-stage flow:
//   1. screening — two yes/no questions that gate the application form.
//      If either answer is no, we never POST anywhere; the applicant just
//      sees the "we regret to inform you…" copy inline.
//   2. form — the actual application. Backend only sees this stage.
//   3. submitted — confirmation; Neil reviews in /admin/leaders.
type Stage = 'screening' | 'rejected' | 'form' | 'submitted';

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
        Want to lead at Power Camp 2026? Two quick questions first, then a short application
        form. Neil reviews every application personally.
      </p>

      @if (stage() === 'screening') {
        <div class="saga-card p-5" data-testid="screening">
          <fieldset class="mb-5">
            <legend class="font-semibold text-sm mb-2" style="color: var(--color-saga-text-strong)">
              Have you been out of school for more than a year?
            </legend>
            <div class="flex gap-2 flex-wrap">
              <button
                type="button"
                (click)="setOutOfSchool(true)"
                class="screen-pill"
                [class.is-active]="outOfSchool() === true"
                data-testid="out-of-school-yes"
              >Yes</button>
              <button
                type="button"
                (click)="setOutOfSchool(false)"
                class="screen-pill"
                [class.is-active]="outOfSchool() === false"
                data-testid="out-of-school-no"
              >No</button>
            </div>
          </fieldset>

          @if (outOfSchool() !== null) {
            <fieldset>
              <legend class="font-semibold text-sm mb-2" style="color: var(--color-saga-text-strong)">
                Are you part of a local church and actively involved in ministry?
              </legend>
              <div class="flex gap-2 flex-wrap">
                <button
                  type="button"
                  (click)="setChurchInvolved(true)"
                  class="screen-pill"
                  [class.is-active]="churchInvolved() === true"
                  data-testid="church-yes"
                >Yes</button>
                <button
                  type="button"
                  (click)="setChurchInvolved(false)"
                  class="screen-pill"
                  [class.is-active]="churchInvolved() === false"
                  data-testid="church-no"
                >No</button>
              </div>
            </fieldset>
          }
        </div>
      } @else if (stage() === 'rejected') {
        <div
          class="saga-card p-4"
          data-testid="rejected"
          style="border-color: var(--color-saga-warning); background-color: var(--color-saga-warning-soft);"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-warning)">
            We regret to inform you…
          </h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">
            You don't quite meet our leader requirements at the moment, but we'd love to hear
            from you anyway. Drop us a line at
            <a href="mailto:powercamplife@gmail.com" style="color: var(--color-saga-action)">powercamplife&#64;gmail.com</a>
            and we can chat.
          </p>
          <div class="flex gap-3 flex-wrap">
            <button type="button" (click)="resetScreening()" class="saga-btn saga-btn-secondary">
              Change my answer
            </button>
            <button type="button" (click)="goHome()" class="saga-btn saga-btn-primary">
              Back to Home
            </button>
          </div>
        </div>
      } @else if (stage() === 'submitted') {
        <div
          class="saga-card p-4"
          data-testid="submitted"
          style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-success)">
            Application received
          </h2>
          <p class="text-sm mb-2" style="color: var(--color-saga-text)">
            Thanks! Your application is on Neil's review queue.
          </p>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">
            <strong>Don't forget to email Neil at
              <a
                [href]="'mailto:' + neilEmail()"
                class="underline"
                style="color: var(--color-saga-action)"
              >{{ neilEmail() }}</a>
              with why you'd like to lead</strong> —
            he won't be able to approve your application without it.
          </p>
          <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
            Once approved, you'll receive an email with a link to finish your registration
            (cell, age, church, t-shirt size, etc.).
          </p>
          <button type="button" (click)="goHome()" class="saga-btn saga-btn-primary">
            Done
          </button>
        </div>
      } @else if (form) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <!-- Why so few fields: full leader details (cell/gender/age/
               church/tshirt/etc.) are captured on /leader-register AFTER
               Neil approves and emails the invite link. This step only
               gets the applicant onto Neil's review queue. -->
          <div
            class="saga-card p-4"
            style="border-color: var(--color-saga-action); background-color: var(--color-saga-primary-soft)"
          >
            <h2 class="font-semibold mb-2" style="color: var(--color-saga-text-strong)">
              One more step — email Neil
            </h2>
            <p class="text-sm mb-2" style="color: var(--color-saga-text)">
              After you submit your name and email below,
              <strong>email Neil at
                <a [href]="'mailto:' + neilEmail()" class="underline" style="color: var(--color-saga-action)">
                  {{ neilEmail() }}
                </a></strong>
              and tell him why you'd like to lead at Power Camp this year.
            </p>
            <p class="text-sm" style="color: var(--color-saga-text-muted)">
              Once Neil approves you, you'll get an email link to complete
              the rest of your details (cell, age, church, t-shirt size, etc.).
            </p>
          </div>

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
  styles: [`
    .screen-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.45rem 1.1rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 9999px;
      border: 1px solid var(--color-saga-border);
      background: transparent;
      color: var(--color-saga-text);
      cursor: pointer;
      transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    }
    .screen-pill:hover { border-color: var(--color-saga-border-strong); }
    .screen-pill.is-active {
      background-color: var(--color-saga-action-soft);
      border-color: var(--color-saga-action);
      color: var(--color-saga-text-strong);
    }
  `],
})
export class LeaderApplyComponent {
  ready = signal(false);
  stage = signal<Stage>('screening');
  outOfSchool = signal<boolean | null>(null);
  churchInvolved = signal<boolean | null>(null);

  form: FormGroup | null = null;
  submitting = signal(false);
  submitError = signal<string | null>(null);
  missingFields = signal<string[]>([]);

  // Driven by the backend's /public-config endpoint (which reads the
  // NEIL_EMAIL env var). The literal here is the launch-day value and
  // acts as a fallback if /public-config can't be reached on first
  // paint — the page is still usable even if the API is briefly down.
  // If you want to change the address permanently, update NEIL_EMAIL
  // in Render, not this literal.
  neilEmail = signal('neil.cable@wol.co.za');

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

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
    this.buildForm();
    this.loadPublicConfig();
  }

  // Best-effort: fetch the env-driven Neil address so the displayed mailto
  // link tracks the NEIL_EMAIL env var without a rebuild. Any failure keeps
  // the constructor default so the page still works offline / on cold-boot.
  private loadPublicConfig(): void {
    this.http
      .get<{ leaderApplicationEmail?: string }>(`${environment.baseApi}/public-config`)
      .subscribe({
        next: (cfg) => {
          if (cfg.leaderApplicationEmail) this.neilEmail.set(cfg.leaderApplicationEmail);
        },
        error: () => {
          // Default already set on the signal — silent fall-through is fine.
        },
      });
  }

  setOutOfSchool(v: boolean): void {
    this.outOfSchool.set(v);
    this.evaluateScreening();
  }

  setChurchInvolved(v: boolean): void {
    this.churchInvolved.set(v);
    this.evaluateScreening();
  }

  resetScreening(): void {
    this.outOfSchool.set(null);
    this.churchInvolved.set(null);
    this.stage.set('screening');
  }

  // Both yes → form. Either no → rejected. One unanswered → keep on
  // screening so the second question shows.
  private evaluateScreening(): void {
    const a = this.outOfSchool();
    const b = this.churchInvolved();
    if (a === false || b === false) {
      this.stage.set('rejected');
      return;
    }
    if (a === true && b === true) {
      this.stage.set('form');
    }
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
          this.stage.set('submitted');
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
    // Minimal payload — only what we need to land them in Neil's review
    // queue. The full leader registration (cell, gender, age, church,
    // tshirt, parent contact) happens on /leader-register once Neil
    // approves and emails them an invite link.
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }
}
