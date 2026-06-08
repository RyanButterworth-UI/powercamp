import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { PageGhostComponent } from '../skeleton/page-ghost.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { SagaSelectComponent, SagaSelectOption } from '../saga-select/saga-select.component';
import { CHURCHES, CHURCH_OTHER } from '../data/churches';

// Same option lists as the camper registration form.
const GENDER_OPTIONS = ['Male', 'Female'] as const;
const AGE_OPTIONS = ['18', '19', '20', '21', '22', '23+'];
const GRADE_OPTIONS = ['Student', 'Working', 'Gap year', 'Other'];
const TSHIRT_OPTIONS = ['small', 'medium', 'large', 'xlarge'];

interface InvitedLeader {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cell: string | null;
  gender: string | null;
  age: string | null;
  grade: string | null;
  dob: string | null;
  church: string | null;
  tshirt: string | null;
  medical: string | null;
  generalInfo: string | null;
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
  selector: 'app-leader-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageGhostComponent, SkeletonComponent, SagaSelectComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-4 sm:p-6 max-w-3xl page-fade-in">
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
            Thanks {{ leader()?.firstName }} — see you at camp! We have your details and Neil will be
            in touch with logistics closer to the date.
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
          Your application was approved. Fill in your details and consent below to lock in your spot
          as a leader for Power Camp 2026.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6">
          <!-- Leader details -->
          <fieldset class="saga-card p-4">
            <legend class="px-2 text-sm font-semibold" style="color: var(--color-saga-text)">
              Your details
            </legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex flex-col gap-1.5 text-sm">Cell
                <input formControlName="cell" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Date of birth
                <input type="date" formControlName="dob" class="w-full px-3 py-2" />
              </label>

              <fieldset aria-label="Gender" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">Gender</legend>
                <div class="grid grid-cols-2 gap-3">
                  @for (g of genderOptions; track g) {
                    <label class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 cursor-pointer">
                      <input type="radio" formControlName="gender" [value]="g" class="absolute inset-0 appearance-none focus:outline-none" />
                      <span class="text-sm font-medium uppercase group-has-checked:text-green-900">{{ g }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <fieldset aria-label="Age" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">Age</legend>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  @for (a of ageOptions; track a) {
                    <label class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-2.5 has-checked:border-green-300 has-checked:bg-green-300 cursor-pointer">
                      <input type="radio" formControlName="age" [value]="a" class="absolute inset-0 appearance-none focus:outline-none" />
                      <span class="text-xs font-medium uppercase group-has-checked:text-green-900 text-center">{{ a }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <fieldset aria-label="Grade or occupation" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">Grade or occupation</legend>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  @for (g of gradeOptions; track g) {
                    <label class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-2.5 has-checked:border-green-300 has-checked:bg-green-300 cursor-pointer">
                      <input type="radio" formControlName="grade" [value]="g" class="absolute inset-0 appearance-none focus:outline-none" />
                      <span class="text-xs font-medium uppercase group-has-checked:text-green-900">{{ g }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <div class="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span>Church</span>
                <app-saga-select
                  [control]="churchSelect"
                  [options]="churchOptions"
                  placeholder="Select your church…"
                  [enableSearch]="true"
                ></app-saga-select>
                @if (otherSelected()) {
                  <input formControlName="church" placeholder="Type your church name" type="text" class="w-full rounded-lg px-3 py-2 mt-1" />
                }
              </div>

              <fieldset aria-label="T-shirt size" class="sm:col-span-2">
                <legend class="text-sm font-medium mb-2">T-shirt size</legend>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  @for (t of tshirtOptions; track t) {
                    <label class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-2.5 has-checked:border-green-300 has-checked:bg-green-300 cursor-pointer">
                      <input type="radio" formControlName="tshirt" [value]="t" class="absolute inset-0 appearance-none focus:outline-none" />
                      <span class="text-xs font-medium uppercase group-has-checked:text-green-900">
                        {{ t === 'xlarge' ? 'X-Large' : (t.charAt(0).toUpperCase() + t.slice(1)) }}
                      </span>
                    </label>
                  }
                </div>
              </fieldset>

              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Medical info / allergies
                <input formControlName="medical" class="w-full px-3 py-2" placeholder="Anything we should know — or leave blank" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm sm:col-span-2">Anything else?
                <input formControlName="generalInfo" class="w-full px-3 py-2" />
              </label>
            </div>
          </fieldset>

          <!-- Consent (mandatory, first-person) -->
          <fieldset class="saga-card p-4" formGroupName="consent">
            <legend class="px-2 text-sm font-semibold" style="color: var(--color-saga-text)">
              Consent (all required)
            </legend>
            <p class="text-xs mb-3" style="color: var(--color-saga-text-muted)">
              Please read the full consent below, then tick each statement to confirm you accept it.
              I, {{ leader()!.firstName }} {{ leader()!.lastName }}, give the following consents for
              Power Camp 2026 (31 July – 2 August 2026):
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
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex flex-col gap-1.5 text-sm">Emergency contact name *
                <input formControlName="emergencyName" class="w-full px-3 py-2" />
              </label>
              <label class="flex flex-col gap-1.5 text-sm">Emergency contact number *
                <input formControlName="emergencyContact" type="tel" class="w-full px-3 py-2" />
              </label>
              <label class="consent-card sm:col-span-2">
                <input type="checkbox" [checked]="noMedicalAid()" (change)="toggleNoMedicalAid($any($event.target).checked)" data-testid="no-medical-aid" />
                <span class="consent-card-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span class="consent-card-text">I'm not on medical aid</span>
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
              [disabled]="form.invalid || submitting()"
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

  readonly genderOptions = GENDER_OPTIONS;
  readonly ageOptions = AGE_OPTIONS;
  readonly gradeOptions = GRADE_OPTIONS;
  readonly tshirtOptions = TSHIRT_OPTIONS;

  // First-person consent — same clauses as the camper form, adapted for an
  // adult registering themselves.
  consentItems: { key: string; label: string }[] = [
    { key: 'general', label: 'I agree to participate in the programs and activities of Power Camp from 31 July 2026 to 2 August 2026, subject to the conditions stated below.' },
    { key: 'location', label: 'I understand that the programs and activities will be held at YFC Magaliesburg (Boitumelo & Kotula), Magaliesburg.' },
    { key: 'risk', label: 'I accept that I participate in all activities at my own risk.' },
    { key: 'powerCamp', label: 'I understand that the Power Camp organisers, facilitators and camp leaders (and the staff of YFC Magaliesburg) will do all in their power to ensure my safety and that of my property, but cannot be held responsible for any loss or damage to life or property that arises while I am at camp. I therefore agree to indemnify and hold harmless the Power Camp organisers (including the facilitators and leaders, and YFC Magaliesburg) against all claims, demands, suits and liability of whatever nature and howsoever arising out of injury to me, and the relevant activity being undertaken.' },
    { key: 'behaviour', label: 'I agree to obey all lawful instructions from the Power Camp organisers and facilitators, and to conduct myself appropriately as a leader at all times.' },
    { key: 'photo', label: 'I give consent for photographs and videos to be taken of me, and for these to be shared with other campers as well as on Power Camp social media sites.' },
  ];

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
      grade: [l.grade ?? ''],
      dob: [l.dob ?? ''],
      church: [l.church ?? ''],
      tshirt: [l.tshirt ?? ''],
      medical: [l.medical ?? ''],
      generalInfo: [l.generalInfo ?? ''],
      consent: this.fb.group({
        general: [l.consentGeneral === 'accept', Validators.requiredTrue],
        location: [l.consentLocation === 'accept', Validators.requiredTrue],
        risk: [l.consentRisk === 'accept', Validators.requiredTrue],
        powerCamp: [l.consentPowerCamp === 'accept', Validators.requiredTrue],
        behaviour: [l.consentBehaviour === 'accept', Validators.requiredTrue],
        photo: [l.consentPhoto === 'accept', Validators.requiredTrue],
        emergencyName: [l.consentEmergencyName ?? '', Validators.required],
        emergencyContact: [l.consentEmergencyContact ?? '', Validators.required],
        medicalAidName: [l.consentMedicalAidName ?? '', Validators.required],
        medicalAidNumber: [l.consentMedicalAidNumber ?? '', Validators.required],
        date: [new Date().toISOString().split('T')[0], Validators.required],
      }),
    });
    this.wireChurchSelect(l.church ?? '');
  }

  private wireChurchSelect(initial: string): void {
    const form = this.form;
    if (!form) return;
    if (!initial) {
      this.churchSelect.setValue('');
      this.otherSelected.set(false);
    } else if (CHURCHES.includes(initial)) {
      this.churchSelect.setValue(initial);
      this.otherSelected.set(false);
    } else {
      this.churchSelect.setValue(CHURCH_OTHER);
      this.otherSelected.set(true);
    }
    this.churchSelect.valueChanges.subscribe((value) => {
      if (value === CHURCH_OTHER) {
        this.otherSelected.set(true);
        if (CHURCHES.includes(form.get('church')?.value ?? '')) {
          form.get('church')?.setValue('');
        }
      } else {
        this.otherSelected.set(false);
        form.get('church')?.setValue(value ?? '');
      }
    });
  }

  noMedicalAid(): boolean {
    const c = this.form?.get('consent');
    return c?.get('medicalAidName')?.value === 'NONE' && c?.get('medicalAidNumber')?.value === 'NONE';
  }

  toggleNoMedicalAid(checked: boolean): void {
    this.form?.get('consent')?.patchValue({
      medicalAidName: checked ? 'NONE' : '',
      medicalAidNumber: checked ? 'NONE' : '',
    });
  }

  submit(): void {
    if (!this.form || !this.token || this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue() as {
      consent: Record<string, unknown>;
      [k: string]: unknown;
    };
    const consentBools = ['general', 'location', 'risk', 'powerCamp', 'behaviour', 'photo'];
    const consent = { ...raw.consent };
    for (const k of consentBools) consent[k] = consent[k] ? 'accept' : '';
    const { consent: _c, ...details } = raw;

    this.http
      .post<{ id: number }>(`${environment.baseApi}/leaders/register`, {
        token: this.token,
        ...details,
        consent,
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
