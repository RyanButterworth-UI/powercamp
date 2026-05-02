import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';

interface VerifiedCamper {
  id: number;
  year: number;
  firstName: string;
  lastName: string;
  email: string | null;
  camperCell: string | null;
  gender: string | null;
  age: string | null;
  grade: string | null;
  friends: string[];
  medical: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string;
  church: string | null;
  tshirt: string | null;
  generalInfo: string | null;
  dob: string | null;
}

@Component({
  selector: 'app-verify-link',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-6 max-w-3xl">
      @if (loading()) {
        <div class="text-gray-500" data-testid="verifying">Verifying your link…</div>
      } @else if (verifyError()) {
        <div class="rounded border border-red-200 bg-red-50 p-4" data-testid="error">
          <h2 class="font-semibold text-red-900 mb-1">Link no longer works</h2>
          <p class="text-sm text-red-900 mb-3">{{ verifyError() }}</p>
          <button type="button" (click)="goHome()" class="px-4 py-2 rounded border border-red-300 text-red-700">
            Go back to search
          </button>
        </div>
      } @else if (submittedAt()) {
        <div class="rounded border border-green-200 bg-green-50 p-4" data-testid="submitted">
          <h2 class="font-semibold text-green-900 mb-1">Registration received</h2>
          <p class="text-sm text-green-900 mb-3">
            Thanks {{ camper()?.firstName }}! Your spot is provisionally held — we'll send a
            confirmation once your payment is complete. Check your inbox at
            <span class="font-mono">{{ camper()?.parentEmail }}</span>.
          </p>
          <button type="button" (click)="goHome()" class="px-4 py-2 rounded bg-green-300 text-green-900">
            Done
          </button>
        </div>
      } @else if (form && camper()) {
        <h2 class="text-xl font-bold mb-1">
          Welcome back, {{ camper()!.firstName }} {{ camper()!.lastName }}
        </h2>
        <p class="text-sm text-gray-500 mb-6">
          Review your details from {{ camper()!.year }}. Edit anything that's changed, then complete
          consent and submit to register for Power Camp 2026.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
          <!-- Camper details -->
          <fieldset class="border rounded p-4">
            <legend class="px-2 text-sm font-semibold text-gray-700">Camper details</legend>
            <div class="grid grid-cols-2 gap-3" formGroupName="camper">
              <label class="flex flex-col text-sm">First Name *
                <input formControlName="firstName" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Last Name *
                <input formControlName="lastName" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Camper Email
                <input formControlName="email" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Camper Cell
                <input formControlName="camperCell" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Gender
                <input formControlName="gender" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Age
                <input formControlName="age" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Grade
                <input formControlName="grade" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Date of birth
                <input type="date" formControlName="dob" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Church
                <input formControlName="church" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">T-shirt size
                <input formControlName="tshirt" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm col-span-2">Medical info
                <input formControlName="medical" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm col-span-2">Anything else
                <input formControlName="generalInfo" class="border rounded px-2 py-1" />
              </label>
            </div>
          </fieldset>

          <!-- Parent details -->
          <fieldset class="border rounded p-4">
            <legend class="px-2 text-sm font-semibold text-gray-700">Parent / guardian</legend>
            <div class="grid grid-cols-2 gap-3" formGroupName="camper">
              <label class="flex flex-col text-sm">Parent name
                <input formControlName="parentName" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Parent phone
                <input formControlName="parentPhone" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm col-span-2">Parent email *
                <input formControlName="parentEmail" class="border rounded px-2 py-1" />
              </label>
            </div>
          </fieldset>

          <!-- Consent (mandatory) -->
          <fieldset class="border rounded p-4" formGroupName="consent">
            <legend class="px-2 text-sm font-semibold text-gray-700">Consent (all required)</legend>
            <p class="text-xs text-gray-500 mb-3">
              I, the parent/guardian of {{ camper()!.firstName }} {{ camper()!.lastName }}, agree to the
              following.
            </p>
            <div class="space-y-2">
              @for (c of consentItems; track c.key) {
                <label class="flex items-center gap-3 text-sm">
                  <input type="checkbox" [formControlName]="c.key" class="h-4 w-4" />
                  <span>{{ c.label }}</span>
                </label>
              }
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <label class="flex flex-col text-sm">Emergency contact name *
                <input formControlName="emergencyName" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Emergency contact number *
                <input formControlName="emergencyContact" class="border rounded px-2 py-1" />
              </label>
              <label class="flex flex-col text-sm">Medical aid name *
                <input formControlName="medicalAidName" class="border rounded px-2 py-1" placeholder="NONE if not on medical aid" />
              </label>
              <label class="flex flex-col text-sm">Medical aid number *
                <input formControlName="medicalAidNumber" class="border rounded px-2 py-1" placeholder="NONE if not on medical aid" />
              </label>
              <label class="flex flex-col text-sm col-span-2">Date of completion *
                <input type="date" formControlName="date" class="border rounded px-2 py-1" />
              </label>
            </div>
          </fieldset>

          @if (submitError()) {
            <div class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900" data-testid="submit-error">
              {{ submitError() }}
            </div>
          }

          <div class="flex gap-3 justify-end">
            <button type="button" (click)="goHome()" class="px-4 py-2 rounded border border-gray-300 text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || submitting()"
              class="px-6 py-2 rounded bg-green-300 text-green-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {{ submitting() ? 'Submitting…' : 'Submit registration' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: ``,
})
export class VerifyLinkComponent {
  loading = signal(true);
  camper = signal<VerifiedCamper | null>(null);
  verifyError = signal<string | null>(null);

  submitting = signal(false);
  submitError = signal<string | null>(null);
  submittedAt = signal<string | null>(null);

  form: FormGroup | null = null;

  consentItems: { key: string; label: string }[] = [
    { key: 'general', label: 'General consent — my child may attend Power Camp.' },
    { key: 'location', label: 'Location consent — I am aware of the venue and the dates.' },
    { key: 'risk', label: 'Risk consent — I accept the inherent risk of camp activities.' },
    { key: 'powerCamp', label: 'Organisers consent — I understand the role of the camp organisers.' },
    { key: 'behaviour', label: 'Behaviour consent — I have read the behaviour policy.' },
    { key: 'photo', label: 'Photo consent — photos taken at camp may be used in camp media.' },
  ];

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private token: string | null = null;

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.loading.set(false);
      this.verifyError.set('No token found in the URL.');
      return;
    }

    this.http
      .post<{ camper: VerifiedCamper }>(`${environment.baseApi}/verify-link`, { token: this.token })
      .subscribe({
        next: (res) => {
          this.camper.set(res.camper);
          this.buildForm(res.camper);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          if (err?.status === 401) {
            this.verifyError.set('This link is invalid or has expired. Please request a new one.');
          } else if (err?.status === 404) {
            this.verifyError.set('We could not find your registration. Please contact the camp organisers.');
          } else {
            this.verifyError.set('Something went wrong verifying your link. Please try again.');
          }
        },
      });
  }

  private buildForm(c: VerifiedCamper): void {
    const required = (v: string | null | undefined) => [v ?? '', Validators.required];
    this.form = this.fb.group({
      camper: this.fb.group({
        firstName: required(c.firstName),
        lastName: required(c.lastName),
        email: [c.email ?? ''],
        camperCell: [c.camperCell ?? ''],
        gender: [c.gender ?? ''],
        age: [c.age ?? ''],
        grade: [c.grade ?? ''],
        friends: [c.friends ?? []],
        medical: [c.medical ?? ''],
        parentName: [c.parentName ?? ''],
        parentPhone: [c.parentPhone ?? ''],
        parentEmail: [c.parentEmail, [Validators.required, Validators.email]],
        church: [c.church ?? ''],
        tshirt: [c.tshirt ?? ''],
        generalInfo: [c.generalInfo ?? ''],
        dob: [c.dob ?? ''],
      }),
      consent: this.fb.group({
        general: [false, Validators.requiredTrue],
        location: [false, Validators.requiredTrue],
        risk: [false, Validators.requiredTrue],
        powerCamp: [false, Validators.requiredTrue],
        behaviour: [false, Validators.requiredTrue],
        photo: [false, Validators.requiredTrue],
        emergencyName: ['', Validators.required],
        emergencyContact: ['', Validators.required],
        medicalAidName: ['', Validators.required],
        medicalAidNumber: ['', Validators.required],
        date: [new Date().toISOString().split('T')[0], Validators.required],
      }),
    });
  }

  submit(): void {
    if (!this.form || !this.token || this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue() as {
      camper: Record<string, unknown>;
      consent: Record<string, unknown>;
    };

    // Map boolean checkbox values to 'accept' strings for the consent fields.
    const consentBools = ['general', 'location', 'risk', 'powerCamp', 'behaviour', 'photo'];
    const consent = { ...raw.consent };
    for (const k of consentBools) consent[k] = consent[k] ? 'accept' : '';

    this.http
      .post<{ id: number; consentAcceptedAt: string }>(`${environment.baseApi}/update`, {
        token: this.token,
        camper: raw.camper,
        consent,
      })
      .subscribe({
        next: (res) => {
          this.submittedAt.set(res.consentAcceptedAt);
          this.submitting.set(false);
        },
        error: (err) => {
          this.submitting.set(false);
          if (err?.status === 401) {
            this.submitError.set('Your sign-in link expired before you could submit. Request a new one.');
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
