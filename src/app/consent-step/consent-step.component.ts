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
        <p class="text-xs mb-4" style="color: var(--color-saga-text-muted)">
          I, the parent/guardian of {{ camperName() }}, agree to the following.
          Tap each statement to tick it — all must be ticked before you can submit.
        </p>

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
          <label class="flex flex-col text-xs font-medium" style="color: var(--color-saga-text)">
            <span class="mb-1.5">Medical aid name <span class="required-star">*</span></span>
            <input
              formControlName="consent_medicalAidName"
              class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
              placeholder="NONE if not on medical aid"
            />
          </label>
          <label class="flex flex-col text-xs font-medium" style="color: var(--color-saga-text)">
            <span class="mb-1.5">Medical aid number <span class="required-star">*</span></span>
            <input
              formControlName="consent_medicalAidNumber"
              class="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
              placeholder="NONE if not on medical aid"
            />
          </label>
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

  consentItems = [
    { key: 'consent_general', label: 'General consent — my child may attend Power Camp.' },
    { key: 'consent_location', label: 'Location consent — I am aware of the venue and the dates.' },
    { key: 'consent_risk', label: 'Risk consent — I accept the inherent risk of camp activities.' },
    { key: 'consent_powerCamp', label: 'Organisers consent — I understand the role of the camp organisers.' },
    { key: 'consent_behaviour', label: 'Behaviour consent — I have read the behaviour policy.' },
    { key: 'consent_photo', label: 'Photo consent — photos taken at camp may be used in camp media.' },
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

  consentValid(): boolean {
    if (!this.form) return false;
    const bools = CONSENT_BOOL_KEYS.every((k) => this.form.get(k)?.value === true);
    const extras = CONSENT_EXTRA_KEYS.every((k) => !!this.form.get(k)?.value?.toString().trim());
    return bools && extras;
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
