import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen w-full flex flex-col justify-start">
      <div
        class="fixed inset-0 w-full h-full p-2 sm:p-0 md:p-0 bg-white flex flex-col z-10"
      >
        <form
          (ngSubmit)="onSubmit()"
          autocomplete="off"
          class="flex-1 flex flex-col h-full"
        >
          <div class="flex-1 flex flex-col w-full h-full overflow-y-auto">
            @if (currentStep() === 1 && stepVisible()) {
              <div
                class="p-5 absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <img
                  src="assets/DSC_0890.JPG"
                  alt="Power Camp group photo"
                  class="mb-6 rounded shadow max-h-64 w-auto object-cover"
                />
                <h1 class="text-3xl font-bold mb-4 text-gray-900">
                  Power Camp 2025 Registration
                </h1>
                <p class="mt-2 text-md text-gray-500">
                  This form is your ticket to all the details - the what, the
                  when, the how, and all the other groovy info for Power Camp
                  2025.
                </p>
                <p class="mt-2 text-md text-gray-500">
                  Here's the deal: Each camper, even if they're from the same
                  family, must complete this form. It's your key to unlocking
                  the adventure ahead!
                </p>

                <button
                  type="button"
                  (click)="fadeToStep(currentStep() + 1)"
                  class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
                >
                  Start Registration
                </button>
              </div>
            }
            @if (currentStep() === 2 && stepVisible()) {
              <div
                class="p-5 absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <h2 class="text-2xl font-bold mb-4 text-gray-900">
                  Camp Details
                </h2>
                <div class="mb-4 text-md text-gray-700 space-y-2">
                  <div>
                    <span class="font-semibold">Starts:</span> Friday 22nd
                    August at 14:00
                  </div>
                  <div>
                    <span class="font-semibold">Ends:</span> Sunday 24th August
                    at 14:00
                  </div>
                  <div>
                    <span class="font-semibold">Where:</span> YFC Magaliesburg
                    (Boitumelo & Kotula)
                  </div>
                  <div>
                    <span class="font-semibold">Who:</span>
                    <span class="text-blue-700 font-bold"
                      >ONLY grade 8 - grade 12</span
                    >
                  </div>
                  <div>
                    <span class="font-semibold">Cost:</span> R3200
                    (accommodation, meals, all activities, and the POWER camp
                    T-shirt)
                  </div>
                  <div class="text-xs text-gray-500">
                    Excludes transport to and from camp and tuck money.
                  </div>
                </div>
                <button
                  type="button"
                  (click)="fadeToStep(currentStep() + 1)"
                  class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
                >
                  Let me Register already!
                </button>
              </div>
            }
            @if (currentStep() === 3 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full overflow-auto"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <p>{{ isFormComplete() }}</p>
                  <p class="my-2 text-md text-gray-500">
                    The details below are for the camper attending Power Camp.
                    Please fill out each field carefully!
                  </p>
                  <p class="mb-6 text-xs font-extrabold text-gray-800">
                    All fields marked <span class="text-red-500">*</span> are
                    required.
                  </p>
                  <label
                    for="firstName"
                    class="block text-sm/6 font-medium text-gray-900"
                  >
                    First Name <span class="text-red-500">*</span>
                  </label>
                  <div class="relative mt-2">
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      [(ngModel)]="formData().firstName"
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
                    class="block text-sm/6 font-medium text-gray-900 mt-6"
                  >
                    Last Name <span class="text-red-500">*</span>
                  </label>
                  <div class="relative mt-2">
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      [(ngModel)]="formData().lastName"
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
                    class="block text-sm/6 font-medium text-gray-900 mt-6"
                  >
                    Camper Cell Number
                  </label>
                  <div class="relative mt-2">
                    <input
                      type="tel"
                      name="camperCell"
                      id="camperCell"
                      [(ngModel)]="formData().camperCell"
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
                  <label
                    for="email"
                    class="block text-sm/6 font-medium text-gray-900 mt-6"
                  >
                    Camper Email
                  </label>
                  <p class="mt-2 mb-2 text-md text-gray-500">
                    Not required but definitely helpful!
                  </p>
                  <div class="relative mt-2">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      [(ngModel)]="formData().email"
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
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class="px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    [disabled]="!formData().firstName || !formData().lastName"
                    class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 4 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <p class="my-2 text-md text-gray-500">
                    So glad to have you here {{ formData().firstName }}, please
                    give us a few more details
                  </p>
                  <p class="mb-6 text-xs font-extrabold text-gray-800">
                    All fields marked <span class="text-red-700">*</span> are
                    required.
                  </p>
                  <fieldset aria-label="Camper Gender">
                    <label class="block mb-2 font-medium">
                      Gender <span class="text-red-700">*</span>
                    </label>
                    <div
                      class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-2 mb-4"
                    >
                      <label
                        aria-label="Male"
                        class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          [(ngModel)]="formData().gender"
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
                          name="gender"
                          value="Female"
                          [(ngModel)]="formData().gender"
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
                    <div
                      class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5 mb-4"
                    >
                      @for (age of ageOptions; track age) {
                        <label
                          [attr.aria-label]="age"
                          class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="age"
                            [value]="age"
                            [(ngModel)]="formData().age"
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
                    name="dob"
                    [(ngModel)]="formData().dob"
                    class="w-full border rounded px-3 py-2 mb-4"
                  />
                  <fieldset aria-label="Camper Grade">
                    <label class="block mb-2 font-medium">
                      Grade <span class="text-red-500">*</span>
                    </label>
                    <div
                      class="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5 mb-4"
                    >
                      @for (grade of grades; track grade) {
                        <label
                          [attr.aria-label]="grade"
                          class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="grade"
                            [value]="grade"
                            [(ngModel)]="formData().grade"
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
                    (click)="fadeToStep(currentStep() - 1)"
                    class="px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    [disabled]="
                      !formData().gender ||
                      !formData().age ||
                      !formData().dob ||
                      !formData().grade
                    "
                    class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 5 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div class="flex flex-col">
                  <label class="my-2 text-md text-gray-500">
                    Power Camp memories last a lifetime! Roommate requests
                    aren’t guaranteed, but we’ll do our best. If you have a
                    fellow champion in mind, share their name below — a
                    supportive teammate can make camp even more awesome!
                  </label>
                  <label class="block text-sm/6 font-medium text-gray-900 mb-6">
                    You can skip this section if needed
                    <span class="text-red-700">*</span>
                  </label>
                  @for (friend of formData().friends; track $index) {
                    <div class="flex flex-row justify-between mb-2">
                      <input
                        type="text"
                        [(ngModel)]="formData().friends[$index]"
                        [name]="'friend' + $index"
                        placeholder="Enter your fellow camper's name"
                        class="w-75 border rounded px-3 py-2"
                      />
                      <button
                        type="button"
                        (click)="removeFriend($index)"
                        class="ml-2 text-red-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          class="size-6"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm3 10.5a.75.75 0 0 0 0-1.5H9a.75.75 0 0 0 0 1.5h6Z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  }
                  <button
                    type="button"
                    (click)="addFriend()"
                    class="my-4 bg-green-300 text-green-900 px-3 py-1 rounded"
                  >
                    Add
                  </button>
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class="px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    class="bg-green-300 text-green-900 px-8 py-2 rounded"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 6 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <label class="block mb-2 font-medium"
                    >Any Medical Issues?</label
                  >
                  <p class="my-2 text-md text-gray-500">
                    We want to be prepared. Please give any important medical
                    info.
                  </p>
                  <label class="block text-sm/6 font-medium text-gray-900 mb-6">
                    You can skip this section if you are fighting fit.
                    <span class="text-red-700">*</span>
                  </label>
                  <textarea
                    [(ngModel)]="formData().medical"
                    name="medical"
                    rows="3"
                    class="w-full border rounded px-3 py-2 mb-4"
                  ></textarea>
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class="px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    class="bg-green-300 text-green-900 px-8 py-2 rounded"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete() && currentStep() !== 10"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 7 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <p class="my-2 text-md text-gray-500">
                    The details below are for the PARENT of
                    {{ formData().firstName }}. Please fill out each field
                    carefully!
                  </p>
                  <p class="mb-6 text-xs font-extrabold text-gray-800">
                    All fields marked <span class="text-red-500">*</span> are
                    required.
                  </p>
                  <fieldset aria-label="Parent/Guardian Details">
                    <label class="block mb-2 font-medium"
                      >Parent/Guardian Name
                      <span class="text-red-500">*</span></label
                    >
                    <div class="relative mt-2 mb-4">
                      <input
                        type="text"
                        [(ngModel)]="formData().parentName"
                        name="parentName"
                        required
                        class="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
                        placeholder="Parent or guardian's full name"
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
                    <label class="block mb-2 font-medium"
                      >Parent/Guardian Phone
                      <span class="text-red-500">*</span></label
                    >
                    <div class="relative mt-2 mb-4">
                      <input
                        type="tel"
                        [(ngModel)]="formData().parentPhone"
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
                    <label class="block mb-2 font-medium"
                      >Parent/Guardian Email
                      <span class="text-red-500">*</span></label
                    >
                    <div class="relative mt-2 mb-4">
                      <input
                        type="email"
                        [(ngModel)]="formData().parentEmail"
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
                  </fieldset>
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class="px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    [disabled]="
                      !formData().parentName ||
                      !formData().parentPhone ||
                      !formData().parentEmail
                    "
                    class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 8 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <label class="block mb-2 font-medium"
                    >T-shirt Size <span class="text-red-700">*</span></label
                  >
                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                    @for (
                      size of ['small', 'medium', 'large', 'xlarge'];
                      track size
                    ) {
                      <label
                        [attr.aria-label]="size"
                        class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="tshirt"
                          [value]="size"
                          [(ngModel)]="formData().tshirt"
                          class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                        />
                        <span
                          class="text-sm font-medium uppercase group-has-checked:text-green-900"
                          >{{
                            size.charAt(0).toUpperCase() +
                              size.slice(1).replace('xlarge', 'X-Large')
                          }}</span
                        >
                      </label>
                    }
                  </div>
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class="px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    [disabled]="!formData().tshirt"
                    class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 9 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <label class="my-2 text-sm text-gray-500">
                    As winter wraps us in its quiet beauty, we’re reminded how
                    important it is to stay connected and warm in fellowship.
                    Please share the name of the church you attend below — just
                    like the steady glow of a winter hearth, your church
                    community helps keep our camp family strong and united
                    through the season! </label
                  ><span class="text-red-700">*</span>
                  <input
                    [(ngModel)]="formData().church"
                    name="generalInfo"
                    rows="3"
                    class="w-full border rounded px-3 py-2 my-4"
                  />
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class=" px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    [disabled]="!formData().church"
                    (click)="fadeToStep(currentStep() + 1)"
                    class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 10 && stepVisible()) {
              <div
                class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <div>
                  <label class="my-2 text-sm text-gray-500">
                    Before you cross the finish line, is there anything else we
                    should know? We want to make sure you have everything you
                    need for an amazing camp experience this winter!
                  </label>
                  <textarea
                    [(ngModel)]="formData().generalInfo"
                    name="generalInfo"
                    rows="3"
                    class="w-full border rounded px-3 py-2 my-4"
                  ></textarea>
                </div>
                <div class="flex gap-6 mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class=" px-8 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    class="bg-green-300 text-green-900 px-8 py-2 rounded"
                  >
                    Next
                  </button>
                  <button
                    *ngIf="isFormComplete()"
                    type="button"
                    (click)="fadeToStep(11)"
                    class="ml-2 px-4 py-2 rounded border bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    Go to End
                  </button>
                </div>
              </div>
            }
            @if (currentStep() === 11 && stepVisible()) {
              <div
                class="absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-in-out w-full h-full"
                [class.opacity-0]="!stepVisible()"
                [class.opacity-100]="stepVisible()"
              >
                <h2 class="text-lg font-bold mb-4">Review your information</h2>
                <div class="space-y-2 text-sm">
                  <p>
                    First Name: {{ formData().firstName }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(3)"
                      aria-label="Edit First Name"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Last Name: {{ formData().lastName }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(3)"
                      aria-label="Edit Last Name"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Camper Cell Number: {{ formData().camperCell }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(3)"
                      aria-label="Edit Camper Cell Number"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Email: {{ formData().email }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(6)"
                      aria-label="Edit Email"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Gender: {{ formData().gender }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(4)"
                      aria-label="Edit Gender"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Age: {{ formData().age }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(4)"
                      aria-label="Edit Age"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Grade: {{ formData().grade }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(4)"
                      aria-label="Edit Grade"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Friends: {{ formData().friends.join(', ') }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(5)"
                      aria-label="Edit Friends"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Medical: {{ formData().medical }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(6)"
                      aria-label="Edit Medical"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Parent Name: {{ formData().parentName }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(7)"
                      aria-label="Edit Parent Name"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Parent Phone: {{ formData().parentPhone }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(7)"
                      aria-label="Edit Parent Phone"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Parent Email: {{ formData().parentEmail }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(7)"
                      aria-label="Edit Parent Email"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Church: {{ formData().church }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(9)"
                      aria-label="Edit Church"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    T-shirt: {{ formData().tshirt }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(8)"
                      aria-label="Edit T-shirt"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                  <p>
                    Other Info: {{ formData().generalInfo }}
                    <button
                      type="button"
                      class="ml-2 align-middle"
                      (click)="fadeToStep(10)"
                      aria-label="Edit Other Info"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="size-5 text-blue-600 inline"
                      >
                        <path
                          d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"
                        />
                        <path
                          d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"
                        />
                      </svg>
                    </button>
                  </p>
                </div>
                <div class="flex mt-6">
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() - 1)"
                    class="mr-2 px-4 py-2 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    (click)="fadeToStep(currentStep() + 1)"
                    class="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Submit
                  </button>
                </div>
              </div>
            }
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [],
})
export class AppComponent {
  currentStep = signal(1);
  grades = ['8', '9', '10', '11', '12'];
  ageOptions = [14, 15, 16, 17, 18];
  formData = signal<CampFormData>({
    firstName: '',
    lastName: '',
    camperCell: '',
    gender: '',
    email: '',
    age: '',
    grade: '',
    friends: [],
    medical: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    church: '',
    tshirt: '',
    generalInfo: '',
    dob: '',
  });
  stepVisible = signal(true);

  nextStep() {
    if (this.currentStep() < 13) this.currentStep.update((v) => v + 1);
  }
  prevStep() {
    if (this.currentStep() > 1) this.currentStep.update((v) => v - 1);
  }
  addFriend() {
    const friends = [...this.formData().friends, ''];
    this.formData.update((fd) => ({ ...fd, friends }));
  }
  removeFriend(i: number) {
    const friends = this.formData().friends.slice();
    friends.splice(i, 1);
    this.formData.update((fd) => ({ ...fd, friends }));
  }
  onSubmit() {
    // TODO: handle form submission (e.g., send to API)
    alert('Form submitted!');
    this.currentStep.set(1);
    this.formData.set({
      firstName: '',
      lastName: '',
      camperCell: '',
      gender: '',
      email: '',
      age: '',
      grade: '',
      friends: [],
      medical: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      church: '',
      tshirt: '',
      generalInfo: '',
      dob: '',
    });
  }

  isValidEmail(email: string) {
    // Simple email validation regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  fadeToStep(step: number) {
    if (step > this.currentStep()) {
      this.stepVisible.set(false);
      setTimeout(() => {
        this.currentStep.set(step);
        this.stepVisible.set(true);
      }, 700);
    } else {
      this.stepVisible.set(false);
      setTimeout(() => {
        this.currentStep.set(step);
        this.stepVisible.set(true);
      }, 700);
    }
  }
  isFormComplete() {
    const data = this.formData();
    return (
      !!data.firstName &&
      !!data.lastName &&
      !!data.gender &&
      !!data.age &&
      !!data.dob &&
      !!data.grade &&
      !!data.parentName &&
      !!data.parentPhone &&
      !!data.parentEmail &&
      !!data.church &&
      !!data.tshirt
    );
  }
}

export interface CampFormData {
  firstName: string;
  lastName: string;
  camperCell: string;
  gender: string;
  email: string;
  age: string;
  grade: string;
  friends: string[];
  medical: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  church: string;
  tshirt: string;
  generalInfo: string;
  dob: string;
}
