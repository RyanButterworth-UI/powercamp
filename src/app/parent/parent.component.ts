import { Component, inject, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { ResetRegistrationService } from '../reset-registration.service';

@Component({
  selector: 'app-parent',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <p class="my-2 text-xs">
            The details below are for the PARENT of
            {{ firstName() }}. Please fill out each field carefully!
          </p>
          <p class="mb-6 text-xs font-semibold text-gray-800">
            Fields marked <span class="required-star">*</span> are required.
          </p>
          <fieldset aria-label="Parent/Guardian Details">
            <label class="block text-xs font-medium text-gray-900">
              Parent Guardian Full Name <span class="required-star">*</span>
            </label>
            <input
              type="text"
              formControlName="parentName"
              name="parentName"
              required
              class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
              placeholder="Parent or guardian's full name e.g Bruce Banner"
            />
            <label class="block text-xs font-medium text-gray-900 mt-5">
              Parent/Guardian Phone <span class="required-star">*</span>
            </label>
            <input
              type="tel"
              formControlName="parentPhone"
              name="parentPhone"
              required
              class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
              placeholder="Parent or guardian's phone number"
            />
            @if (
              form.get('parentPhone')?.invalid &&
              form.get('parentPhone')?.dirty &&
              form.get('parentPhone')?.value
            ) {
              <p class="text-xs mt-1" style="color: var(--color-saga-danger)">
                Please enter a valid cell number
              </p>
            }
            <label class="block text-xs font-medium text-gray-900 mt-5">
              Parent/Guardian Email <span class="required-star">*</span>
            </label>
            <input
              type="email"
              formControlName="parentEmail"
              name="parentEmail"
              required
              class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
              placeholder="Parent or guardian's email address"
            />
            @if (
              form.get('parentEmail')?.invalid &&
              form.get('parentEmail')?.dirty &&
              form.get('parentEmail')?.value
            ) {
              <p class="text-xs mt-1" style="color: var(--color-saga-danger)">Please enter a valid email</p>
            }
          </fieldset>
        </div>
        @if (missingLabels().length > 0) {
          <p class="text-xs mt-3" style="color: var(--color-saga-warning)">
            Still need: {{ missingLabels().join(', ') }}
          </p>
        }
        <div class="flex gap-3 mt-4 items-center flex-wrap">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Medical)"
            class="saga-btn saga-btn-secondary"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.Tshirt)"
            class="saga-btn saga-btn-primary"
          >
            Next
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
export class ParentComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  protected readonly resetSvc = inject(ResetRegistrationService);

  camperFields = ['parentPhone', 'parentEmail', 'parentName'];

  private readonly LABELS: Record<string, string> = {
    parentName: 'Parent Name',
    parentPhone: 'Parent Phone',
    parentEmail: 'Parent Email',
  };

  missingLabels(): string[] {
    return this.camperFields
      .filter((f) => !this.form.get(f)?.valid)
      .map((f) => this.LABELS[f] ?? f);
  }

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  // Plain method, not computed() — form.get().value isn't a signal, so a
  // computed would only run once at init and never reflect typed input.
  firstName(): string { return this.form.get('firstName')?.value || ''; }

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
