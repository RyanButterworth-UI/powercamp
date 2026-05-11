import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { SagaSelectComponent, SagaSelectOption } from '../saga-select/saga-select.component';
import { CHURCHES, CHURCH_OTHER } from '../data/churches';

// Same option lists as the main registration form (camp-additional-info
// + t-shirt). Duplicated here rather than imported because each step
// component owns its constants — the camp-additional-info component
// keeps them as plain signals on the class. Keeping the values literal
// here means a future tweak to one needs the other touched too.
const GENDER_OPTIONS = ['Male', 'Female'] as const;
const AGE_OPTIONS = ['14', '15', '16', '17', '18', 'Leader 18+'];
const GRADE_OPTIONS = ['8', '9', '10', '11', '12', 'Leader'];
const TSHIRT_OPTIONS = ['small', 'medium', 'large', 'xlarge'];

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
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent, SagaSelectComponent],
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

              <!-- Gender: radio cards, same shape as camp-additional-info. -->
              <fieldset aria-label="Gender" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">Gender</legend>
                <div class="grid grid-cols-2 gap-3">
                  @for (g of genderOptions; track g) {
                    <label
                      class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 cursor-pointer"
                    >
                      <input
                        type="radio"
                        formControlName="gender"
                        [value]="g"
                        class="absolute inset-0 appearance-none focus:outline-none"
                      />
                      <span class="text-sm font-medium uppercase group-has-checked:text-green-900">{{ g }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <!-- Age: 14-18 + "Leader 18+" for adults. -->
              <fieldset aria-label="Age" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">Age</legend>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  @for (a of ageOptions; track a) {
                    <label
                      class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-2.5 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 cursor-pointer"
                    >
                      <input
                        type="radio"
                        formControlName="age"
                        [value]="a"
                        class="absolute inset-0 appearance-none focus:outline-none"
                      />
                      <span class="text-xs font-medium uppercase group-has-checked:text-green-900 text-center">{{ a }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <!-- Grade: 8-12 + "Leader". -->
              <fieldset aria-label="Grade" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">Grade</legend>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  @for (g of gradeOptions; track g) {
                    <label
                      class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-2.5 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 cursor-pointer"
                    >
                      <input
                        type="radio"
                        formControlName="grade"
                        [value]="g"
                        class="absolute inset-0 appearance-none focus:outline-none"
                      />
                      <span class="text-xs font-medium uppercase group-has-checked:text-green-900">{{ g }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Date of birth
                <input type="date" formControlName="dob" class="w-full px-3 py-2" />
              </label>

              <!-- Church: same saga-select as the t-shirt step, with the
                   "Other" escape hatch for churches not in the list. -->
              <div class="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span>Church</span>
                <app-saga-select
                  [control]="churchSelect"
                  [options]="churchOptions"
                  placeholder="Select your church…"
                  [enableSearch]="true"
                ></app-saga-select>
                @if (otherSelected()) {
                  <input
                    formControlName="church"
                    placeholder="Type your church name"
                    type="text"
                    class="w-full rounded-lg px-3 py-2 mt-1"
                  />
                }
              </div>

              <!-- T-shirt: radio cards, same option list as the t-shirt step. -->
              <fieldset aria-label="T-shirt size" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">T-shirt size</legend>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  @for (t of tshirtOptions; track t) {
                    <label
                      class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-2.5 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 cursor-pointer"
                    >
                      <input
                        type="radio"
                        formControlName="tshirt"
                        [value]="t"
                        class="absolute inset-0 appearance-none focus:outline-none"
                      />
                      <span class="text-xs font-medium uppercase group-has-checked:text-green-900">
                        {{ t === 'xlarge' ? 'X-Large' : (t.charAt(0).toUpperCase() + t.slice(1)) }}
                      </span>
                    </label>
                  }
                </div>
              </fieldset>

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
                <label class="consent-card">
                  <input type="checkbox" [formControlName]="c.key" />
                  <span class="consent-card-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="consent-card-text">{{ c.label }}</span>
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
              <label class="consent-card sm:col-span-2">
                <input
                  type="checkbox"
                  [checked]="noMedicalAid()"
                  (change)="toggleNoMedicalAid($any($event.target).checked)"
                  data-testid="no-medical-aid"
                />
                <span class="consent-card-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span class="consent-card-text">We're not on medical aid</span>
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

  // Option lists rendered as radio cards in the template — mirror what
  // camp-additional-info + t-shirt show on the main registration flow.
  readonly genderOptions = GENDER_OPTIONS;
  readonly ageOptions = AGE_OPTIONS;
  readonly gradeOptions = GRADE_OPTIONS;
  readonly tshirtOptions = TSHIRT_OPTIONS;

  // Standalone control for the church saga-select (same pattern as the
  // t-shirt step). We sync it both directions with the camper.church
  // form field in buildForm() so selecting from the dropdown writes
  // through, and an existing church value (or "Other") opens the
  // free-text input.
  churchSelect = new FormControl<string>('');
  otherSelected = signal(false);
  readonly churchOptions: SagaSelectOption[] = [
    ...CHURCHES.map((c) => ({ value: c, label: c })),
    { value: CHURCH_OTHER, label: 'Other (type your own)' },
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
    this.wireChurchSelect(c.church ?? '');
  }

  // Same sync pattern as the camper t-shirt step. The saga-select holds
  // either a known church from the list OR the literal CHURCH_OTHER
  // sentinel. When the user picks "Other" we open a free-text input
  // that writes through to the camper.church form control.
  private wireChurchSelect(initial: string): void {
    const camperGroup = this.form?.get('camper');
    if (!camperGroup) return;

    if (!initial) {
      this.churchSelect.setValue('');
      this.otherSelected.set(false);
    } else if (CHURCHES.includes(initial)) {
      this.churchSelect.setValue(initial);
      this.otherSelected.set(false);
    } else {
      // Anything not in the list is treated as a free-text "Other" entry.
      this.churchSelect.setValue(CHURCH_OTHER);
      this.otherSelected.set(true);
    }

    this.churchSelect.valueChanges.subscribe((value) => {
      if (value === CHURCH_OTHER) {
        this.otherSelected.set(true);
        // Clear the existing church so the free-text input doesn't
        // come up pre-populated with a stale name from the list.
        if (CHURCHES.includes(camperGroup.get('church')?.value ?? '')) {
          camperGroup.get('church')?.setValue('');
        }
      } else {
        this.otherSelected.set(false);
        camperGroup.get('church')?.setValue(value ?? '');
      }
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
