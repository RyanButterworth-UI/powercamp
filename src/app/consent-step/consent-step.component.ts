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
        <p class="text-sm mb-5" style="color: var(--color-saga-text-muted)">
          I, the parent/guardian of {{ camperName() }}, agree to the following.
          Each consent must be ticked before you can submit.
        </p>

        <div class="space-y-2 mb-6">
          @for (c of consentItems; track c.key) {
            <label class="flex items-center gap-3 text-sm cursor-pointer" style="color: var(--color-saga-text)">
              <input type="checkbox" [formControlName]="c.key" class="h-4 w-4" />
              <span>{{ c.label }}</span>
            </label>
          }
        </div>

        <div class="flex justify-end mb-2">
          <button
            type="button"
            (click)="useParentAsEmergencyContact()"
            class="text-xs underline cursor-pointer"
            style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
            data-testid="same-as-parent"
          >
            Use parent's name &amp; number
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <label class="flex flex-col text-sm">
            <span class="mb-1">Emergency contact name <span class="required-star">*</span></span>
            <input formControlName="consent_emergencyName" class="rounded-lg w-full px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="mb-1">Emergency contact number <span class="required-star">*</span></span>
            <input formControlName="consent_emergencyContact" type="tel" class="rounded-lg w-full px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="mb-1">Medical aid name <span class="required-star">*</span></span>
            <input
              formControlName="consent_medicalAidName"
              class="rounded-lg w-full px-3 py-2"
              placeholder="NONE if not on medical aid"
            />
          </label>
          <label class="flex flex-col text-sm">
            <span class="mb-1">Medical aid number <span class="required-star">*</span></span>
            <input
              formControlName="consent_medicalAidNumber"
              class="rounded-lg w-full px-3 py-2"
              placeholder="NONE if not on medical aid"
            />
          </label>
          <label class="flex flex-col text-sm sm:col-span-2">
            <span class="mb-1">Date of completion <span class="required-star">*</span></span>
            <input formControlName="consent_date" type="date" class="rounded-lg px-3 py-2" />
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
