import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BaseComponent } from './base/base.component';
import { ConsentType } from '../../consent';
import { SummaryComponent } from './summary/summary.component';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';



@Component({
  selector: 'app-consent',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    BaseComponent,
    SummaryComponent,
    SuccessDialogComponent,
  ],
  template: `
    <div
      class="container mx-auto bg:white lg:bg-slate-100 my-0 min-h-dvh font-inter flex lg:justify-center lg:items-center"
    >
      @if (showDialog()) {
        <app-success-dialog
          [camperName]="submittedCamperName()"
          [status]="submissionStatus()"
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

      <div [formGroup]="consent" class=" w-full lg:w-1/2 mx-auto px-4">

        @if (currentStep() === 1) {
          <div class="flex flex-col  py-10">
            <p class="text-left pb-2">
              Please note that this indemnity must be completed once for EVERY
              child that is attending Power Camp.
            </p>
            <p class="text-left pb-2">
              Each consent must must be accepted for you to move to the next step.
            </p>
            <p class="text-left pb-2">
              The last page will capture emergenecy contact details.
            </p>
            <button
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="nextStep()"
            >
              Continue
            </button>
          </div>
        }
        @if (currentStep() === 2) {
          <div class="pt-10 mx-auto">
            <label class="block text-sm/2 font-medium text-gray-900 mb-2">
              Parent Name <span class="text-red-700">*</span>
            </label>
            <input
              type="text"
              formControlName="parentName"
              class="w-full border border-gray-500 rounded px-3 py-2 mb-4"
            />
            <div class="flex justify-between gap-2">
              <div class="flex flex-col w-full">
                <label class="block text-sm/2 font-medium text-gray-900 mb-2">
                  Camper Name <span class="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  formControlName="camperName"
                  class="w-full border border-gray-500 rounded px-3 py-2 mb-4"
                />
              </div>
              <div class="flex flex-col w-full">
                <label class="block text-sm/2 font-medium text-gray-900 mb-2">
                  Camper Age <span class="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  formControlName="camperAge"
                  class="w-full border border-gray-500 rounded px-3 py-2 mb-4"
                />
              </div>
            </div>
            <div class="flex gap-2 w-full">
              @for (size of ['8', '9', '10', '11', '12'];
                track size) {
                <div class="w-full">
                  <label
                    [attr.aria-label]="size"
                    class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
                  >
                    <input
                      type="radio"
                      formControlName="camperGrade"
                      [value]="size"
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
                </div>
              }
            </div>
            <div class="flex justify-between mt-2">
              <button
                class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
                (click)="previousStep()"
              >
                back
              </button>
              <button
                [disabled]="!areFieldsValid(parentFields)"
                class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
                (click)="nextStep()"
              >
                Continue
              </button>
            </div>
          </div>
        }
        @if (currentStep() === 3) {
          <div class="px-2 py-6">
            <h1 class="text-2xl mb-2">Consent</h1>
            <p>I {{ consent.get('parentName')?.value }}, parent/guardian of  {{ consent.get('camperName')?.value }}
              agree to the following:</p>
          </div>
          <app-base
            [consentText]="ConsentType.General"
            [formControlNameLabel]="'generalConsent'">
          </app-base>
          <app-base
            [consentText]="ConsentType.Location"
            [formControlNameLabel]="'locationConsent'">
          </app-base>
          <app-base
            [consentText]="ConsentType.Risk"
            [formControlNameLabel]="'riskConsent'">
          </app-base>
          <div class="flex justify-between mt-2">
            <button
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="previousStep()"
            >
              back
            </button>
            <button
              [disabled]="!areFieldsValid(generalConsent)"
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="nextStep()"
            >
              Continue
            </button>
          </div>
        }
        @if (currentStep() === 4) {
          <div class="px-2 py-6">
            <h1 class="text-2xl mb-2">Consent</h1>
            <p>I {{ consent.get('parentName')?.value }}, parent/guardian of  {{ consent.get('camperName')?.value }}
              agree to the following:</p>
          </div>
          <app-base
            [consentText]="ConsentType.PowerCamp"
            [formControlNameLabel]="'powerCampConsent'">
          </app-base>
          <app-base
            [consentText]="ConsentType.Behavior"
            [formControlNameLabel]="'behaviourConsent'">
          </app-base>
          <div class="flex justify-between mt-2">
            <button
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="previousStep()"
            >
              back
            </button>
            <button
              [disabled]="!areFieldsValid(powerCamp)"
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="nextStep()"
            >
              Continue
            </button>
          </div>
        }
        @if (currentStep() === 5) {
          <div class="px-2 py-6">
            <h1 class="text-2xl mb-2">Consent</h1>
            <p>I {{ consent.get('parentName')?.value }}, parent/guardian of  {{ consent.get('camperName')?.value }}
              agree to the following:</p>
          </div>
          <app-base
            [consentText]="ConsentType.Photo"
            [formControlNameLabel]="'photoConsent'">
          </app-base>
          <div class="flex justify-between mt-2">
            <button
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="previousStep()"
            >
              back
            </button>
            <button
              [disabled]="!areFieldsValid(photo)"
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="nextStep()"
            >
              Continue
            </button>
          </div>
        }
        @if (currentStep() === 6) {
          <div class="px-2 py-6">
            <h1 class="text-2xl mb-2">Consent</h1>
          </div>
          <div class="flex flex-col w-full">
            <label class="block text-sm/2 font-medium text-gray-900 mb-2">
              Emergency Contact Person Name <span class="text-red-700">*</span>
            </label>
            <input
              placeholder="The PERSON we call if there is a medical event"
              type="text"
              formControlName="emergencyName"
              class="w-full border border-gray-500 rounded px-3 py-2 mb-4 placeholder:text-sm"
            />
          </div>
          <div class="flex flex-col w-full">
            <label class="block text-sm/2 font-medium text-gray-900 mb-2">
              Emergency Contact Number <span class="text-red-700">*</span>
            </label>
            <input
              placeholder="The NUMBER we call if there is a medical event"
              type="number"
              formControlName="emergencyContact"
              class="w-full border border-gray-500 rounded px-3 py-2 mb-4 placeholder:text-sm"
            />
          </div>
          <div class="flex flex-col w-full">
            <label class="block text-sm/2 font-medium text-gray-900 mb-2">
              Medical Aid Name <span class="text-red-700">*</span>
            </label>
            <input
              placeholder="please type NONE if you are not on medical aid."
              type="text"
              formControlName="medicalAidName"
              class="w-full border border-gray-500 rounded px-3 py-2 mb-4 placeholder:text-sm"
            />
          </div>
          <div class="flex flex-col w-full">
            <label class="block text-sm/2 font-medium text-gray-900 mb-2">
              Medical Aid membership number <span class="text-red-700">*</span>
            </label>
            <input
              placeholder="please type NONE if you are not on medical aid."
              type="text"
              formControlName="medicalAidNumber"
              class="w-full border border-gray-500 rounded px-3 py-2 mb-4 placeholder:text-sm"
            />
          </div>
          <div class="flex flex-col w-full">
            <label class="block text-sm/2 font-medium text-gray-900 mb-2">
              Please enter the date of completion of this form <span class="text-red-700">*</span>
            </label>
            <input
              type="date"
              formControlName="dateOfCompletion"
              class="border border-gray-500 rounded px-3 py-2 mb-4 placeholder:text-sm placeholder:text-gray-500"
            />
          </div>
          <div class="flex justify-between mt-2">
            <button
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="previousStep()"
            >
              back
            </button>
            <button
              [disabled]="!areFieldsValid(medical)"
              class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
              (click)="nextStep()"
            >
              Continue
            </button>
          </div>
        }
        @if (currentStep() === 7) {
          <app-summary
            (navigateBack)="previousStep()"
            (triggerSubmission)="onSubmit()"
          ></app-summary>
        }
      </div>
      }
    </div>
  `,
  styles: ``,
})
export class ConsentComponent implements OnInit {
  fb = inject(FormBuilder);
  consent: FormGroup = this.fb.group({});
  private readonly http = inject(HttpClient);

  currentStep = signal<number>(1);
  showDialog = signal(false);
  submissionStatus = signal<'success' | 'error'>('success');
  submittedCamperName = signal('Dear Camper');
  isSubmitting  = signal(false);

  parentFields = ['parentName', 'camperName', 'camperAge', 'camperGrade'];
  generalConsent = ['generalConsent', 'locationConsent', 'riskConsent'];
  powerCamp = ['powerCampConsent', 'behaviourConsent'];
  photo = ['photoConsent'];
  medical = [
    'medicalAidName',
    'emergencyContact',
    'medicalAidNumber',
    'dateOfCompletion',
  ];

  ngOnInit() {
    this.consent = this.fb.group({
      parentName: ['', Validators.required],
      camperName: ['', Validators.required],
      camperAge: ['', Validators.required],
      camperGrade: ['', Validators.required],
      generalConsent: ['', Validators.required],
      locationConsent: ['', Validators.required],
      riskConsent: ['', Validators.required],
      powerCampConsent: ['', Validators.required],
      behaviourConsent: ['', Validators.required],
      photoConsent: ['', Validators.required],
      medicalAidName: ['', Validators.required],
      emergencyName: ['', Validators.required],
      emergencyContact: ['', Validators.required],
      medicalAidNumber: ['', Validators.required],
      dateOfCompletion: ['', Validators.required],
    });
  }

  nextStep() {
    this.currentStep.set(this.currentStep() + 1);
  }

  previousStep() {
    this.currentStep.set(this.currentStep() - 1);
  }

  areFieldsValid(fields: string[]): boolean {
    return fields.every((field) => this.consent.get(field)?.valid);
  }

  logForm() {
    console.log(this.consent.value);
  }

  onSubmit() {
    const data = this.consent.getRawValue();
    this.submittedCamperName.set(data.camperName);

    this.isSubmitting.set(true); // start loader

    const url = `${environment.baseApi}/consent`;

    this.http.post(url, data).subscribe({
      next: () => {
        this.submissionStatus.set('success');
        this.showDialog.set(true);
        this.isSubmitting.set(false); // stop loader
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

  protected readonly ConsentType = ConsentType;
}
