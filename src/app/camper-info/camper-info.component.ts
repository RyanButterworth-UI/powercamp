import { Component, input, OnInit, output } from '@angular/core';
import { StepKey } from '../../models';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';

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
          <p class="my-2 text-md text-gray-500">
            The details below are for the camper attending Power Camp. Please
            fill out each field carefully!
          </p>
          <p class="mb-6 text-xs font-extrabold text-gray-800">
            All fields marked <span class="text-red-500">*</span> are required.
          </p>
          <label
            for="firstName"
            class="block text-sm/2 font-medium text-gray-900"
          >
            First Name <span class="text-red-500">*</span>
          </label>
          <div class="relative mt-2">
            <input
              type="text"
              formControlName="firstName"
              id="firstName"
              class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
              placeholder="First name of the camper"
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
          <label
            for="lastName"
            class="block text-sm/2 font-medium text-gray-900 mt-6"
          >
            Last Name <span class="text-red-700">*</span>
          </label>
          <div class="relative mt-2">
            <input
              type="text"
              formControlName="lastName"
              id="lastName"
              class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
              placeholder="Last name of the camper"
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
          <label
            for="camperCell"
            class="block text-sm/2 font-medium text-gray-900 mt-6"
          >
            Camper Cell Number
          </label>
          <div class="relative mt-2">
            <input
              type="tel"
              formControlName="camperCell"
              id="camperCell"
              class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
              placeholder="082 555 5555"
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
            form.get('camperCell')?.invalid &&
            form.get('camperCell')?.dirty &&
            form.get('camperCell')?.value
          ) {
            <div>
              <p class="text-red-700 text-sm">
                Please enter a valid cell number
              </p>
            </div>
          }
          <label
            for="email"
            class="block text-sm/2 font-medium text-gray-900 mt-6"
          >
            Camper Email
          </label>
          <p class="mt-2 mb-2 text-md text-gray-500 text-xs">
            Not required but definitely helpful!
          </p>
          <div class="relative mt-2">
            <input
              type="email"
              formControlName="email"
              id="email"
              class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
              placeholder="camper@power.com"
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
            form.get('email')?.invalid &&
            form.get('email')?.dirty &&
            form.get('email')?.value
          ) {
            <div>
              <p class="text-red-700 text-sm">Please enter a valid email</p>
            </div>
          }
        </div>
        <div class="flex gap-6 mt-10">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Details)"
            class="px-8 py-2 rounded border border-gray-300  text-gray-600 cursor-pointer"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.CamperAdditionalInfo)"
            class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 cursor-pointer disabled:text-white disabled:cursor-not-allowed"
          >
            Next
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

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  camperFields = ['firstName', 'lastName'];

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
