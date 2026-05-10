import { Component, inject, input, output } from '@angular/core';
import { StepKey } from '../../models';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { ResetRegistrationService } from '../reset-registration.service';

@Component({
  selector: 'app-camper-info',
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="customer-wrapper"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <form [formGroup]="form">
        <div>
          <p class="my-2 text-xs">
            The details below are for the camper attending Power Camp. Please
            fill out each field carefully!
          </p>
          <p class="mb-6 text-xs font-semibold text-gray-800">
            Fields marked <span class="required-star">*</span> are required.
          </p>
          <label for="firstName" class="block text-xs font-medium text-gray-900">
            First Name <span class="required-star">*</span>
          </label>
          <input
            type="text"
            formControlName="firstName"
            id="firstName"
            class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            placeholder="First name of the camper"
          />
          <label for="lastName" class="block text-xs font-medium text-gray-900 mt-5">
            Last Name <span class="required-star">*</span>
          </label>
          <input
            type="text"
            formControlName="lastName"
            id="lastName"
            class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            placeholder="Last name of the camper"
          />
          <label for="camperCell" class="block text-xs font-medium text-gray-900 mt-5">
            Camper Cell Number
          </label>
          <input
            type="tel"
            formControlName="camperCell"
            id="camperCell"
            class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            placeholder="082 555 5555"
          />
          @if (
            form.get('camperCell')?.invalid &&
            form.get('camperCell')?.dirty &&
            form.get('camperCell')?.value
          ) {
            <p class="text-xs mt-1" style="color: var(--color-saga-danger)">
              Please enter a valid cell number
            </p>
          }
          <label for="email" class="block text-xs font-medium text-gray-900 mt-5">
            Camper Email
            <span class="ml-1 text-[11px] font-normal text-gray-500">(optional but helpful)</span>
          </label>
          <input
            type="email"
            formControlName="email"
            id="email"
            class="mt-1.5 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            placeholder="camper@power.com"
          />
          @if (
            form.get('email')?.invalid &&
            form.get('email')?.dirty &&
            form.get('email')?.value
          ) {
            <p class="text-xs mt-1" style="color: var(--color-saga-danger)">Please enter a valid email</p>
          }
        </div>
        @if (missingLabels().length > 0) {
          <p class="text-xs mt-3" style="color: var(--color-saga-warning)">
            Still need: {{ missingLabels().join(', ') }}
          </p>
        }
        <div class="flex gap-3 mt-4 items-center flex-wrap">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.LeaderApplication)"
            class="saga-btn saga-btn-secondary"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.CamperAdditionalInfo)"
            class="saga-btn saga-btn-primary"
          >
            Next
          </button>
          <button
            type="button"
            (click)="resetSvc.request()"
            class="saga-btn saga-btn-warning"
            data-testid="reset-registration"
          >
            Restart
          </button>
        </div>
      </form>
    </div>
  `,
  styles: ``,
})
export class CamperInfoComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  protected readonly resetSvc = inject(ResetRegistrationService);

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  camperFields = ['firstName', 'lastName'];

  private readonly LABELS: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
  };

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }

  missingLabels(): string[] {
    return this.camperFields
      .filter((f) => !this.form.get(f)?.valid)
      .map((f) => this.LABELS[f] ?? f);
  }
}
