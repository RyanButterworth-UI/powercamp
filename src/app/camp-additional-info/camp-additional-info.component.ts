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
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <p class="my-2 text-sm">
            So glad to have you here {{ firstName() }}, please give us a few
            more details
          </p>
          <p class="mb-6 text-xs font-extrabold text-gray-800">
            All fields marked <span class="text-red-700">*</span> are required.
          </p>
          <fieldset aria-label="Camper Gender">
            <label class="block text-sm/2 font-medium text-gray-900">
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
                class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
              >
                <input
                  type="radio"
                  formControlName="gender"
                  value="Female"
                  class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                />
                <span
                  class="text-sm font-medium uppercase group-has-checked:text-green-900"
                  >Female</span
                >
              </label>
            </div>
          </fieldset>
          <fieldset aria-label="Camper Age">
            <label class="block text-sm/2 font-medium text-gray-900">
              Age <span class="text-red-700">*</span>
            </label>
            <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 mb-4">
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

          <label class="block text-sm/2 font-medium text-gray-900 mb-2">
            Date of Birth <span class="text-red-700">*</span>
          </label>
          <input
            type="date"
            formControlName="dob"
            (click)="openDatePicker($event)"
            (focus)="openDatePicker($event)"
            class="w-full rounded-lg mb-4 px-3 py-2"
            style="cursor: pointer;"
            min="2002-01-01"
            [max]="todayIso"
          />
          <fieldset aria-label="Camper Grade">
            <label class="block text-sm/2 font-medium text-gray-900">
              Grade <span class="text-red-700">*</span>
            </label>
            <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 mb-4">
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
        @if (missingLabels().length > 0) {
          <p class="text-xs mt-3" style="color: var(--color-saga-warning)">
            Still need: {{ missingLabels().join(', ') }}
          </p>
        }
        <div class="flex gap-6 mt-4">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Details)"
            class="saga-btn saga-btn-secondary"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.Friends)"
            class="saga-btn saga-btn-primary"
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
  grades = signal(['8', '9', '10', '11', '12', 'Leader']);
  // String values so the form's age field stays a string — the backend zod
  // schema rejects numbers and Excel-style numeric ages broke earlier
  // submissions ("Expected string, received number").
  ageOptions = signal<string[]>(['14', '15', '16', '17', '18', 'Leader 18+']);
  camperFields = ['gender', 'age', 'dob', 'grade'];

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  firstName = computed(() => this.form.get('firstName')?.value || '');
  todayIso = new Date().toISOString().split('T')[0];

  private readonly LABELS: Record<string, string> = {
    gender: 'Gender',
    age: 'Age',
    dob: 'Date of Birth',
    grade: 'Grade',
  };

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }

  missingLabels(): string[] {
    return this.camperFields
      .filter((f) => !this.form.get(f)?.valid)
      .map((f) => this.LABELS[f] ?? f);
  }

  // Some browsers (Safari, especially mobile) don't pop the native date
  // picker until the icon is clicked. showPicker() forces the calendar
  // open as soon as the field receives focus or a click.
  openDatePicker(e: Event): void {
    const el = e.target as HTMLInputElement & { showPicker?: () => void };
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
      } catch {
        // Some browsers throw when the input is disabled — silent ignore.
      }
    }
  }
}
