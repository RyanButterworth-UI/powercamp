import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgClass } from '@angular/common';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-feedback',
  imports: [ReactiveFormsModule, NgClass, SuccessDialogComponent],
  template: `
    <div
      class="container mx-auto bg:white lg:bg-slate-100 my-0 min-h-dvh font-inter flex lg:justify-center lg:items-center"
    >
      <div class="w-full lg:w-1/2 h-full flex flex-col">
        <div class="w-full mx-auto h-full flex flex-col">
          @if (showDialog()) {
            <app-success-dialog
              [camperName]="submittedCamperName()"
              [status]="submissionStatus()"
              [feedback]="true"
              [consent]="false"
              (refreshApp)="refreshApp()"
            ></app-success-dialog>
          } @else {
            @if (isSubmitting()) {
              <div
                class="fixed inset-0 z-50 flex items-center justify-center bg-white/80"
              >
                <div
                  class="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 border-solid"
                ></div>
              </div>
            }
            <form [formGroup]="feedback" class="w-full lg:w-1/2 mx-auto px-4" (ngSubmit)="onSubmit()">
              @if (currentStep() === 0) {
                <div class="my-4 flex flex-col justify-between">
                  <img src='./assets/Pc2025.png' alt="" class="p-4">
                  <p class="block text-sm/4 font-medium text-gray-900 mb-3">Thank you for attending Power Camp 2025!
                    Please take the time to fill out the feedback form. We use this info to plan for next year.</p>
                  <p class="block text-sm/4 font-medium text-gray-900 mb-3"><span class="required-star">*</span> We had
                    some technical glitches this year and
                    this has already been noted.</p>
                  <p class="block text-sm/4 font-medium text-gray-900 mb-3">Dates for next year: Due to planning and
                    scheduling, Power camp will be: 31 July - 2 August. </p>
                  <div class="flex justify-between mt-2">
                    <button
                      class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded"
                      (click)="previousStep()"
                      type="button"
                    >
                      back
                    </button>
                    <button
                      class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded"
                      (click)="nextStep()"
                      type="button"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              }
              @if (currentStep() === 1) {
                <div>
                  <div>
                    <p class="block text-sm/4 font-medium text-gray-500 py-2">
                     Camper Feedback:
                    </p>
                    <label class="block text-xs/6 font-medium text-gray-900 my-2">
                     Please enter the FULL name of the camper
                      <span class="required-star">*</span>
                    </label>
                    <input
                      formControlName="camperName"
                      placeholder="e.g John Calvin"
                      name="camperName"
                      class="w-full border rounded px-3 py-2 mb-4 text-sm"
                    />
                  </div>
                  <div class="my-4">
                    <p class="block text-sm/2 font-medium text-gray-900 mb-3">
                      Organisation Of Camp <span class="required-star">*</span>
                    </p>
                    <p class="block text-sm/2 font-medium text-gray-500 mb-3">
                      Did Camp run well?
                    </p>
                    <div class="flex gap-2 w-full">
                      @for (size of ['0', '1', '2', '3', '4', '5']; track size) {
                        <div class="w-full">
                          <label
                            [attr.aria-label]="size"
                            class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                          >
                            <input
                              type="radio"
                              formControlName="campOrganization"
                              [value]="size"
                              class="absolute inset-0 appearance-none focus:outline-none text-white"
                            />
                            <span
                              class="text-sm font-medium uppercase group-has-checked:text-green-900 text-gray-900"
                            >{{ size.charAt(0).toUpperCase() }}</span
                            >
                          </label>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="my-4">
                    <p class="block text-sm/2 font-medium text-gray-900 mb-3">
                      Spirtual Input <span class="required-star">*</span>
                    </p>
                    <p class="block text-sm/2 font-medium text-gray-500 mb-3">
                      How did you find the speaker and devotions?
                    </p>
                    <div class="flex gap-2 w-full">
                      @for (spiritualInput of ['0', '1', '2', '3', '4', '5'];
                        track spiritualInput) {
                        <div class="w-full">
                          <label
                            [attr.aria-label]="spiritualInput"
                            class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                          >
                            <input
                              type="radio"
                              formControlName="spiritualInput"
                              [value]="spiritualInput"
                              class="absolute inset-0 appearance-none focus:outline-none text-white"
                            />
                            <span
                              class="text-sm font-medium uppercase group-has-checked:text-green-900 text-gray-900"
                            >{{ spiritualInput.charAt(0).toUpperCase() }}</span
                            >
                          </label>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="my-4">
                    <p class="block text-sm/2 font-medium text-gray-900 mb-3">
                      Activities <span class="required-star">*</span>
                    </p>
                    <p class="block text-sm/2 font-medium text-gray-500 mb-3">
                      Did you have the best time ever?
                    </p>
                    <div class="flex gap-2 w-full">
                      @for (activities of ['0', '1', '2', '3', '4', '5'];
                        track activities) {
                        <div class="w-full">
                          <label
                            [attr.aria-label]="activities"
                            class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                          >
                            <input
                              type="radio"
                              formControlName="activities"
                              [value]="activities"
                              class="absolute inset-0 appearance-none focus:outline-none text-white"
                            />
                            <span
                              class="text-sm font-medium uppercase group-has-checked:text-green-900 text-gray-900"
                            >{{ activities.charAt(0).toUpperCase() }}</span
                            >
                          </label>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="my-4">
                    <p class="block text-sm/2 font-medium text-gray-900 mb-3">
                      Meals/Campsite <span class="required-star">*</span>
                    </p>
                    <p class="block text-sm/2 font-medium text-gray-500 mb-3">
                      This applies to YFC's facilites
                    </p>
                    <div class="flex gap-2 w-full">
                      @for (facilities of ['0', '1', '2', '3', '4', '5'];
                        track facilities) {
                        <div class="w-full">
                          <label
                            [attr.aria-label]="facilities"
                            class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                          >
                            <input
                              type="radio"
                              formControlName="facilities"
                              [value]="facilities"
                              class="absolute inset-0 appearance-none focus:outline-none text-white"
                            />
                            <span
                              class="text-sm font-medium uppercase group-has-checked:text-green-900 text-gray-900"
                            >{{ facilities.charAt(0).toUpperCase() }}</span
                            >
                          </label>
                        </div>
                      }
                    </div>
                    <div class="w-full mt-2">
                      <p class="text-xs text-red-700">0 - Needs Work</p>
                      <p class="text-xs text-yellow-600">
                        2 - Middle of the Road
                      </p>
                      <p class="text-xs text-green-700">5 - Couldn't be better</p>
                    </div>
                  </div>
                  <div class="flex justify-between mt-2">
                    <button
                      class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded"
                      (click)="previousStep()"
                      type="button"
                    >
                      back
                    </button>
                    <button
                      [disabled]="!areFieldsValid(required)"
                      class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded"
                      (click)="nextStep()"
                      type="button"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              }

              @if (currentStep() === 2) {
                <div class="my-4">
                  <label class="block text-sm/4 font-medium text-gray-900 mb-3">
                    Please give us some input on your highlight of this years
                    camp.
                    <span class="text-sm text-gray-500">(Optional)</span>
                  </label>

                  <div class="mt-2">
                  <textarea
                    id="comment"
                    formControlName="userComment"
                    rows="4"
                    class="block w-full rounded-md px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  ></textarea>
                  </div>
                </div>
                <div class="flex flex-col w-full">
                  <label class="block text-sm/2 font-medium text-gray-900 mb-2">
                    Describe PowerCamp 2025 in one word <span class="text-sm text-gray-500">(Optional)</span>
                  </label>
                  <input
                    placeholder="SuperIncredibleAmazingAwesomeness"
                    type="text"
                    formControlName="oneWord"
                    class="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm text-gray-900 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
                <p class="block text-sm/4 font-medium text-gray-900 mb-3">
                  Would you like any follow-up after camp?<span
                  class="text-red-700"
                >*</span
                >
                </p>

                <div class="flex gap-2 w-full">
                  @for (requiresFeedback of ['Yes', 'No'];
                    track requiresFeedback) {
                    <div class="w-full">
                      <label
                        [attr.aria-label]="requiresFeedback"
                        class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                      >
                        <input
                          type="radio"
                          formControlName="requiresFeedback"
                          [value]="requiresFeedback"
                          class="absolute inset-0 appearance-none focus:outline-none text-white"
                        />
                        <span
                          class="text-sm font-medium uppercase group-has-checked:text-green-900 text-gray-900"
                        >{{ requiresFeedback }}</span
                        >
                      </label>
                    </div>
                  }
                </div>
                <div class="my-4">
                  <label class="block text-sm/4 font-medium text-gray-900 mb-3">
                    Is there anything else you would like to let us know? <span
                    class="text-sm text-gray-500">(Optional)</span>
                  </label>

                  <div class="mt-2">
                  <textarea
                    id="comment"
                    formControlName="additionalInfo"
                    rows="4"
                    class="block w-full rounded-md px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  ></textarea>
                  </div>
                </div>
                <div class="flex justify-between mt-2">
                  <button
                    class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded"
                    (click)="previousStep()"
                    type="button"
                  >
                    back
                  </button>
                  <button
                    type="submit"
                    [disabled]="!areFieldsValid(required)"
                    class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded"
                  >
                    Submit
                  </button>
                </div>
              }
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class FeedbackComponent implements OnInit {
  fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  feedback!: FormGroup;
  currentStep = signal<number>(0);
  showDialog = signal(false);
  submittedCamperName = signal('Dear Camper');
  submissionStatus = signal<'success' | 'error'>('success');
  isSubmitting = signal(false);

  nextStep() {
    this.currentStep.set(this.currentStep() + 1);
  }

  previousStep() {
    this.currentStep.set(this.currentStep() - 1);
  }

  required = [
    'camperName',
    'campOrganization',
    'spiritualInput',
    'activities',
    'facilities',
  ];

  areFieldsValid(fields: string[]): boolean {
    return fields.every((field) => this.feedback.get(field)?.valid);
  }

  ngOnInit() {
    this.feedback = this.fb.group({
      camperName: ['', Validators.required],
      campOrganization: ['', Validators.required],
      spiritualInput: ['', Validators.required],
      activities: ['', Validators.required],
      facilities: ['', Validators.required],
      userComment: [''],
      oneWord: [''],
      requiresFeedback: ['', Validators.required],
      additionalInfo: [''],
    });
  }

  onSubmit() {
    this.isSubmitting.set(true);
    const url = `${environment.baseApi}/feedback`;
    const feedback = this.feedback.value;
    this.submittedCamperName.set(feedback.camperName);

    this.http.post(url, feedback).subscribe({
      next: () => {
        this.submissionStatus.set('success');
        this.showDialog.set(true);
        this.isSubmitting.set(false);
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.submissionStatus.set('error');
        this.showDialog.set(true);
        this.isSubmitting.set(false); // stop loader
      },
    });
  }
  refreshApp() {
    window.location.reload();
    this.showDialog.set(false);
  }
}
