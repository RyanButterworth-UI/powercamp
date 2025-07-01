import { Component, computed, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';

@Component({
  selector: 'app-parent',
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
            The details below are for the PARENT of
            {{ firstName() }}. Please fill out each field carefully!
          </p>
          <p class="mb-6 text-xs font-extrabold text-gray-800">
            All fields marked <span class="text-red-700">*</span> are required.
          </p>
          <fieldset aria-label="Parent/Guardian Details">
            <label class="block text-sm/2 font-medium text-gray-900"
              >Parent/Guardian Name <span class="text-red-700">*</span></label
            >
            <div class="relative mt-2 mb-4">
              <input
                type="text"
                formControlName="parentName"
                name="parentName"
                required
                class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
                placeholder="Parent or guardian's full name e.g Bruce Banner"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                />
              </svg>
            </div>
            <label class="block text-sm/2 font-medium text-gray-900"
              >Parent/Guardian Phone <span class="text-red-500">*</span></label
            >
            <div class="relative mt-2 mb-2">
              <input
                type="tel"
                formControlName="parentPhone"
                name="parentPhone"
                required
                class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
                placeholder="Parent or guardian's phone number"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400"
              >
                <path
                  d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z"
                />
                <path
                  fill-rule="evenodd"
                  d="M8.625.75A3.375 3.375 0 0 0 5.25 4.125v15.75a3.375 3.375 0 0 0 3.375 3.375h6.75a3.375 3.375 0 0 0 3.375-3.375V4.125A3.375 3.375 0 0 0 15.375.75h-6.75ZM7.5 4.125C7.5 3.504 8.004 3 8.625 3H9.75v.375c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V3h1.125c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 0 1 7.5 19.875V4.125Z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            @if (
              form.get('parentPhone')?.invalid &&
              form.get('parentPhone')?.dirty &&
              form.get('parentPhone')?.value
            ) {
              <div class="mb-2">
                <p class="text-red-700 text-sm">
                  Please enter a valid cell number
                </p>
              </div>
            }
            <label class="block text-sm/2 font-medium text-gray-900"
              >Parent/Guardian Email <span class="text-red-500">*</span></label
            >
            <div class="relative mt-2 ">
              <input
                type="email"
                formControlName="parentEmail"
                name="parentEmail"
                required
                class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
                placeholder="Parent or guardian's email address"
              />
              <svg
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
                data-slot="icon"
              >
                <path
                  d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z"
                />
                <path
                  d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z"
                />
              </svg>
            </div>
            @if (
              form.get('parentEmail')?.invalid &&
              form.get('parentEmail')?.dirty &&
              form.get('parentEmail')?.value
            ) {
              <div class="mb-2">
                <p class="text-red-700 text-sm">Please enter a valid email</p>
              </div>
            }
          </fieldset>
        </div>
        <div class="flex gap-6 mt-6">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Medical)"
            class="px-8 py-2 rounded border border-gray-300  text-gray-600 cursor-pointer"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.Tshirt)"
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
export class ParentComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;

  camperFields = ['parentPhone', 'parentEmail', 'parentName'];

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  firstName = computed(() => this.form.get('firstName')?.value || '');

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
