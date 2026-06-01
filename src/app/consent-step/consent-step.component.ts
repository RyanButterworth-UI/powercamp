import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { ResetRegistrationService } from '../reset-registration.service';

const CONSENT_BOOL_KEYS = [
  'consent_general',
  'consent_location',
  'consent_risk',
  'consent_powerCamp',
  'consent_behaviour',
  'consent_photo',
] as const;

const CONSENT_EXTRA_KEYS = [
  'consent_emergencyName',
  'consent_emergencyContact',
  'consent_medicalAidName',
  'consent_medicalAidNumber',
  'consent_date',
] as const;

@Component({
  selector: 'app-consent-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <h2 class="text-xl font-bold mb-2">Consent (required for each child)</h2>
        <p class="text-xs mb-3" style="color: var(--color-saga-text-muted)">
          Please read the full consent below, then tick each statement to confirm you accept it.
          All statements must be accepted before you can submit.
        </p>
        <div
          class="rounded-lg p-3 mb-4 text-sm"
          style="background-color: var(--color-saga-primary-soft); border: 1px solid var(--color-saga-primary); color: var(--color-saga-text);"
          data-testid="consent-preamble"
        >
          I, <span class="font-semibold">{{ parentFullName() }}</span>, parent/guardian of
          <span class="font-semibold">{{ camperName() }}</span>, give the following consents for
          Power Camp 2026 (31 July – 2 August 2026):
        </div>

        <div class="flex flex-col gap-2 mb-6">
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

        <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <label class="flex flex-col text-xs font-medium" style="color: var(--color-saga-text)">
            <span class="mb-1.5">Emergency contact name <span class="required-star">*</span></span>
            <input
              formControlName="consent_emergencyName"
              class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            />
          </label>
          <label class="flex flex-col text-xs font-medium" style="color: var(--color-saga-text)">
            <span class="mb-1.5">Emergency contact number <span class="required-star">*</span></span>
            <input
              formControlName="consent_emergencyContact"
              type="tel"
              class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            />
          </label>
          <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label class="flex flex-col text-xs font-medium" style="color: var(--color-saga-text)">
                <span class="mb-1.5">Medical aid name <span class="required-star">*</span></span>
                <input
                  formControlName="consent_medicalAidName"
                  class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                />
              </label>
              <label class="flex flex-col text-xs font-medium" style="color: var(--color-saga-text)">
                <span class="mb-1.5">Medical aid number <span class="required-star">*</span></span>
                <input
                  formControlName="consent_medicalAidNumber"
                  class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                />
              </label>
            }
          </div>
          <label class="flex flex-col text-xs font-medium sm:col-span-2" style="color: var(--color-saga-text)">
            <span class="mb-1.5">Date of completion <span class="required-star">*</span></span>
            <input
              formControlName="consent_date"
              type="date"
              class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:max-w-xs"
            />
          </label>
        </div>

        <div
          class="rounded-lg p-3 mb-4 text-xs"
          style="background-color: var(--color-saga-primary-soft); border: 1px solid var(--color-saga-primary); color: var(--color-saga-text);"
        >
          By submitting, the parent and camper email addresses on file are added to the
          Power Camp mailing list — we'll use it for camp updates, packing reminders, and the odd
          'is the bus on time?' bulletin. Each email has a one-click unsubscribe in the footer
          if it's ever not for you. Registration confirmations and payment receipts always come
          through, regardless of subscription state.
        </div>

        <div class="flex gap-3 mt-4 items-center flex-wrap">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.CheckData)"
            class="saga-btn saga-btn-secondary"
          >
            Back
          </button>
          <button
            type="button"
            [disabled]="!consentValid()"
            (click)="triggerSubmission.emit()"
            class="saga-btn saga-btn-primary"
          >
            Confirm
          </button>
          <button
            type="button"
            (click)="resetSvc.request()"
            class="saga-btn saga-btn-warning"
          >Restart</button>
        </div>
      </div>
    </form>
  `,
  styles: ``,
})
export class ConsentStepComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  triggerSubmission = output<void>();
  StepKey = StepKey;
  protected readonly resetSvc = inject(ResetRegistrationService);

  // Full formal consent wording, carried over from previous years' indemnity
  // form and updated to the 2026 dates/venue. Each statement is its own
  // specific, informed consent (POPIA). The fourth statement intentionally
  // combines the "safety of child & property" and "indemnity" clauses from
  // the prior form into one acceptance so the data model stays at six
  // boolean fields (no DB migration), while still showing the parent the
  // complete liability wording from previous years.
  consentItems = [
    {
      key: 'consent_general',
      label:
        'I give permission for my child to participate in the programs and activities of Power Camp from 31 July 2026 to 2 August 2026, subject to the conditions stated below.',
    },
    {
      key: 'consent_location',
      label:
        'I understand that the programs and activities will be held at YFC Magaliesburg (Boitumelo & Kotula), Magaliesburg.',
    },
    {
      key: 'consent_risk',
      label:
        'I accept that my child participates in all activities at his/her own risk.',
    },
    {
      key: 'consent_powerCamp',
      label:
        'I understand that the Power Camp organisers, facilitators and camp leaders (and the staff of YFC Magaliesburg) will do all in their power to ensure the safety of my child and his/her property, but cannot be held responsible for any loss or damage to life or property that arises while my child is at camp. I therefore agree to indemnify and hold harmless the Power Camp organisers (including the facilitators and leaders, and YFC Magaliesburg) against all claims, demands, suits and liability of whatever nature and howsoever arising out of injury to my child, and the relevant activity being undertaken.',
    },
    {
      key: 'consent_behaviour',
      label:
        'I understand that my child will be required to obey all lawful instructions from the facilitators, leaders and any other Power Camp authorities. I also hereby give consent that my child may be sent home if they behave inappropriately, as decided by the Power Camp organisers.',
    },
    {
      key: 'consent_photo',
      label:
        'I give consent for photographs and videos to be taken of my child, and for these to be shared with other campers as well as on Power Camp social media sites.',
    },
  ];

  // Plain methods rather than computed() — the form's get().value calls
  // aren't signals, so a computed() would only run once at init and never
  // pick up the user's input. Angular's change detection re-evaluates these
  // on every CD cycle, which fires on each form input.
  camperName(): string {
    const f = this.form.get('firstName')?.value ?? '';
    const l = this.form.get('lastName')?.value ?? '';
    return `${f} ${l}`.trim() || 'this camper';
  }

  // Parent/guardian full name for the formal consent preamble. Falls back to
  // a neutral phrase before the Parent step has been filled in.
  parentFullName(): string {
    return (this.form.get('parentName')?.value ?? '').toString().trim() || 'the parent/guardian';
  }

  consentValid(): boolean {
    if (!this.form) return false;
    const bools = CONSENT_BOOL_KEYS.every((k) => this.form.get(k)?.value === true);
    const extras = CONSENT_EXTRA_KEYS.every((k) => !!this.form.get(k)?.value?.toString().trim());
    return bools && extras;
  }

  // "Not on medical aid" is derived from the form rather than tracked as
  // its own field — if both medical-aid strings are exactly "NONE" we
  // treat the toggle as on. Saves us threading another field through the
  // form definition / draft persistence / backend payload.
  noMedicalAid(): boolean {
    return (
      this.form.get('consent_medicalAidName')?.value === 'NONE' &&
      this.form.get('consent_medicalAidNumber')?.value === 'NONE'
    );
  }

  toggleNoMedicalAid(checked: boolean): void {
    this.form.patchValue({
      consent_medicalAidName: checked ? 'NONE' : '',
      consent_medicalAidNumber: checked ? 'NONE' : '',
    });
  }

  // Convenience: copy parentName / parentPhone into the emergency contact
  // fields. Most parents are themselves the emergency contact, so this
  // saves them retyping the same details.
  useParentAsEmergencyContact(): void {
    const parentName = this.form.get('parentName')?.value ?? '';
    const parentPhone = this.form.get('parentPhone')?.value ?? '';
    this.form.patchValue({
      consent_emergencyName: parentName,
      consent_emergencyContact: parentPhone,
    });
  }

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }
}
