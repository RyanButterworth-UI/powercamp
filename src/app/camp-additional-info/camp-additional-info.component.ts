import { Component, computed, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';

@Component({
  selector: 'app-camp-additional-info',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <p class="my-2 text-md text-gray-500">
            So glad to have you here {{ firstName() }}, please give us a few
            more details
          </p>
          <p class="mb-6 text-xs font-extrabold text-gray-800">
            All fields marked <span class="text-red-700">*</span> are required.
          </p>
          <fieldset aria-label="Camper Gender">
            <label class="block mb-2 font-medium">
              Gender <span class="text-red-700">*</span>
            </label>
            <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-2 mb-4">
              <label
                aria-label="Male"
                class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
              >
                <input
                  type="radio"
                  formControlName="gender"
                  value="Male"
                  class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                />
                <span
                  class="text-sm font-medium uppercase group-has-checked:text-green-900"
                  >Male</span
                >
              </label>
              <label
                aria-label="Female"
                class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-600 has-checked:bg-green-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
              >
                <input
                  type="radio"
                  formControlName="gender"
                  value="Female"
                  class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                />
                <span
                  class="text-sm font-medium uppercase group-has-checked:text-white"
                  >Female</span
                >
              </label>
            </div>
          </fieldset>
          <fieldset aria-label="Camper Age">
            <label class="block mb-2 font-medium">
              Age <span class="text-red-500">*</span>
            </label>
            <div class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5 mb-4">
              @for (age of ageOptions(); track age) {
                <label
                  [attr.aria-label]="age"
                  class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                >
                  <input
                    type="radio"
                    formControlName="age"
                    [value]="age"
                    class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                  />
                  <span
                    class="text-sm font-medium uppercase group-has-checked:text-green-900"
                    >{{ age }}</span
                  >
                </label>
              }
            </div>
          </fieldset>
          <label class="block mb-2 font-medium">
            Date of Birth <span class="text-red-700">*</span>
          </label>
          <input
            type="date"
            formControlName="dob"
            class="w-full border rounded px-3 py-2 mb-4"
          />
          <fieldset aria-label="Camper Grade">
            <label class="block mb-2 font-medium">
              Grade <span class="text-red-500">*</span>
            </label>
            <div class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5 mb-4">
              @for (grade of grades(); track grade) {
                <label
                  [attr.aria-label]="grade"
                  class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                >
                  <input
                    type="radio"
                    formControlName="grade"
                    [value]="grade"
                    class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                  />
                  <span
                    class="text-sm font-medium uppercase group-has-checked:text-green-900"
                    >{{ grade }}</span
                  >
                </label>
              }
            </div>
          </fieldset>
        </div>
        <div class="flex gap-6 mt-6">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Friends)"
            class="px-8 py-2 rounded border"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.Friends)"
            class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </form>
  `,
  styles: ``,
})
export class CampAdditionalInfoComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  grades = signal(['8', '9', '10', '11', '12']);
  ageOptions = signal([14, 15, 16, 17, 18]);
  camperFields = ['firstName', 'lastName'];

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  firstName = computed(() => this.form.get('firstName')?.value || '');

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
