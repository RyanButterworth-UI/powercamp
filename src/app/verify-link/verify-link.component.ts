import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { SkeletonComponent } from '../skeleton/skeleton.component';

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
  // Existing consent values (or null). Stored as 'accept' on the DB row
  // when previously accepted; null when never given. Used to prefill the
  // edit form so a parent doesn't have to re-tick six boxes they already
  // agreed to last year.
  consentGeneral: string | null;
  consentLocation: string | null;
  consentRisk: string | null;
  consentPowerCamp: string | null;
  consentBehaviour: string | null;
  consentPhoto: string | null;
  consentEmergencyName: string | null;
  consentEmergencyContact: string | null;
  consentMedicalAidName: string | null;
  consentMedicalAidNumber: string | null;
  consentDate: string | null;
}

@Component({
  selector: 'app-verify-link',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  template: `
    <div class="container mx-auto p-4 sm:p-6 max-w-3xl">
      @if (loading()) {
        <!-- Skeleton card while we verify the magic-link token. Same
             footprint as the real form so the page doesn't jump. The
             label text is preserved as a sub-line beneath the skeleton
             for users who like to know *what* is loading. -->
        <div class="saga-card p-4" data-testid="verifying">
          <app-skeleton width="40%" height="20px" />
          <div class="mt-2">
            <app-skeleton width="80%" height="14px" />
          </div>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <app-skeleton shape="block" height="38px" />
            <app-skeleton shape="block" height="38px" />
            <app-skeleton shape="block" height="38px" />
            <app-skeleton shape="block" height="38px" />
          </div>
          <p class="text-xs mt-3" style="color: var(--color-saga-text-muted)">
            Verifying your link…
          </p>
        </div>
      } @else if (verifyError()) {
        <div
          class="saga-card p-4"
          data-testid="error"
          style="border-color: var(--color-saga-danger); background-color: var(--color-saga-danger-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-danger)">
            Link no longer works
          </h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">{{ verifyError() }}</p>
          <button type="button" (click)="goHome()" class="saga-btn saga-btn-secondary">
            Go back to search
          </button>
        </div>
      } @else if (submittedAt()) {
        <div
          class="saga-card p-4"
          data-testid="submitted"
          style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1" style="color: var(--color-saga-success)">
            Registration received
          </h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">
            Thanks {{ camper()?.firstName }}! Your spot is provisionally held — we'll send a
            confirmation once your payment is complete. Check your inbox at
            <span class="font-mono">{{ camper()?.parentEmail }}</span>.
          </p>
          <button type="button" (click)="goHome()" class="saga-btn saga-btn-primary">
            Done
          </button>
        </div>
      } @else if (form && camper()) {
        <h2 class="text-xl font-bold mb-1" style="color: var(--color-saga-text-strong)">
          Welcome back, {{ camper()!.firstName }} {{ camper()!.lastName }}
        </h2>
        <p class="text-sm mb-6" style="color: var(--color-saga-text-muted)">
          Review your details from {{ camper()!.year }}. Edit anything that's changed, then complete
          consent and submit to register for Power Camp 2026.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6">
          <!-- Camper details -->
          <fieldset class="saga-card p-4">
            <legend class="px-2 text-sm font-semibold" style="color: var(--color-saga-text)">
              Camper details
            </legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" formGroupName="camper">
              <label class="flex flex-col gap-1.5 text-sm">First Name *
                <input formControlName="firstName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Last Name *
                <input formControlName="lastName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Camper Email
                <input formControlName="email" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Camper Cell
                <input formControlName="camperCell" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Gender
                <input formControlName="gender" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Age
                <input formControlName="age" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Grade
                <input formControlName="grade" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Date of birth
                <input type="date" formControlName="dob" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Church
                <input formControlName="church" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">T-shirt size
                <input formControlName="tshirt" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Medical info
                <input formControlName="medical" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Anything else
                <input formControlName="generalInfo" class="w-full px-3 py-2" />
              </label>
            </div>
          </fieldset>

          <!-- Parent details -->
          <fieldset class="saga-card p-4">
            <legend class="px-2 text-sm font-semibold" style="color: var(--color-saga-text)">
              Parent / guardian
            </legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" formGroupName="camper">
              <label class="flex flex-col gap-1.5 text-sm">Parent name
                <input formControlName="parentName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Parent phone
                <input formControlName="parentPhone" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Parent email *
                <input formControlName="parentEmail" class="w-full px-3 py-2" />
              </label>
            </div>
          </fieldset>

          <!-- Consent (mandatory) -->
          <fieldset class="saga-card p-4" formGroupName="consent">
            <legend class="px-2 text-sm font-semibold" style="color: var(--color-saga-text)">
              Consent (all required)
            </legend>
            <p class="text-xs mb-3" style="color: var(--color-saga-text-muted)">
              I, the parent/guardian of {{ camper()!.firstName }} {{ camper()!.lastName }}, agree to the
              following.
            </p>
            <div class="flex flex-col gap-2">
              @for (c of consentItems; track c.key) {
                <label class="flex items-center gap-3 text-sm">
                  <input type="checkbox" [formControlName]="c.key" class="h-4 w-4 shrink-0 m-0" />
                  <span class="leading-5">{{ c.label }}</span>
                </label>
              }
            </div>
            <div class="flex items-center justify-between gap-2 mt-4 mb-2 flex-wrap">
              <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-saga-text-muted)">
                Emergency &amp; medical aid
              </span>
              <button
                type="button"
                (click)="useParentAsEmergencyContact()"
                class="saga-btn saga-btn-secondary !py-1 !px-2.5 !text-xs"
                data-testid="same-as-parent"
              >
                Use parent's name &amp; number
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex flex-col gap-1.5 text-sm">Emergency contact name *
                <input formControlName="emergencyName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Emergency contact number *
                <input formControlName="emergencyContact" class="w-full px-3 py-2" />
              </label>
              <!-- "Not on medical aid" toggle — mirrors the camper consent
                   step. Hides + zeroes the medical-aid inputs when on. -->
              <label class="flex items-center gap-2 text-sm sm:col-span-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  [checked]="noMedicalAid()"
                  (change)="toggleNoMedicalAid($any($event.target).checked)"
                  data-testid="no-medical-aid"
                  class="h-4 w-4"
                />
                <span>We're not on medical aid</span>
              </label>
              @if (!noMedicalAid()) {
                <label class="flex flex-col gap-1.5 text-sm">Medical aid name *
                  <input formControlName="medicalAidName" class="w-full px-3 py-2" />
                </label>
                <label class="flex flex-col gap-1.5 text-sm">Medical aid number *
                  <input formControlName="medicalAidNumber" class="w-full px-3 py-2" />
                </label>
              }
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Date of completion *
                <input type="date" formControlName="date" class="w-full px-3 py-2" />
              </label>
            </div>
          </fieldset>

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
              [disabled]="form.invalid || submitting()"
              class="saga-btn saga-btn-primary w-full sm:w-auto"
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
        // Prefill from prior values so the edit form doesn't reset what
        // the parent already agreed to. 'accept' → true; anything else → false.
        general: [c.consentGeneral === 'accept', Validators.requiredTrue],
        location: [c.consentLocation === 'accept', Validators.requiredTrue],
        risk: [c.consentRisk === 'accept', Validators.requiredTrue],
        powerCamp: [c.consentPowerCamp === 'accept', Validators.requiredTrue],
        behaviour: [c.consentBehaviour === 'accept', Validators.requiredTrue],
        photo: [c.consentPhoto === 'accept', Validators.requiredTrue],
        emergencyName: [c.consentEmergencyName ?? '', Validators.required],
        emergencyContact: [c.consentEmergencyContact ?? '', Validators.required],
        medicalAidName: [c.consentMedicalAidName ?? '', Validators.required],
        medicalAidNumber: [c.consentMedicalAidNumber ?? '', Validators.required],
        // Always set the consent date to today on edit — re-confirming the
        // consent block represents a fresh affirmation, regardless of the
        // historical row's consentDate.
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

  // Mirrors the camper consent step: "Not on medical aid" is derived from
  // the form values rather than a tracked field. If both medical-aid
  // strings equal 'NONE' the toggle reads as on.
  noMedicalAid(): boolean {
    const c = this.form?.get('consent');
    return (
      c?.get('medicalAidName')?.value === 'NONE' &&
      c?.get('medicalAidNumber')?.value === 'NONE'
    );
  }

  toggleNoMedicalAid(checked: boolean): void {
    this.form?.get('consent')?.patchValue({
      medicalAidName: checked ? 'NONE' : '',
      medicalAidNumber: checked ? 'NONE' : '',
    });
  }

  // Convenience: copy parentName / parentPhone (from the Camper block)
  // into the emergency contact fields. Most parents are themselves the
  // emergency contact — same affordance the camper consent step offers.
  useParentAsEmergencyContact(): void {
    const camper = this.form?.get('camper');
    const parentName = camper?.get('parentName')?.value ?? '';
    const parentPhone = camper?.get('parentPhone')?.value ?? '';
    this.form?.get('consent')?.patchValue({
      emergencyName: parentName,
      emergencyContact: parentPhone,
    });
  }
}
