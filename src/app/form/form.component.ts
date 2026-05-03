import { Component, inject, signal } from '@angular/core';
import { CampAdditionalInfoComponent } from '../camp-additional-info/camp-additional-info.component';
import { CamperInfoComponent } from '../camper-info/camper-info.component';
import { DetailsComponent } from '../details/details.component';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FriendsComponent } from '../friends/friends.component';
import { IntroComponent } from '../intro/intro.component';
import { LookupComponent } from '../lookup/lookup.component';
import { ConsentStepComponent } from '../consent-step/consent-step.component';
import { LeaderApplicationComponent } from '../leader-application/leader-application.component';
import { LeaderInfoComponent } from '../leader-info/leader-info.component';
import { MedicalComponent } from '../medical/medical.component';
import { OtherInfoComponent } from '../other-info/other-info.component';
import { ParentComponent } from '../parent/parent.component';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { SummaryComponent } from '../summary/summary.component';
import { TShirtComponent } from '../t-shirt/t-shirt.component';
import { StepKey } from '../../models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-form',
  imports: [
    CampAdditionalInfoComponent,
    CamperInfoComponent,
    DetailsComponent,
    FormsModule,
    FriendsComponent,
    IntroComponent,
    LookupComponent,
    ConsentStepComponent,
    LeaderApplicationComponent,
    LeaderInfoComponent,
    MedicalComponent,
    OtherInfoComponent,
    ParentComponent,
    SuccessDialogComponent,
    SummaryComponent,
    TShirtComponent,
    ReactiveFormsModule,
  ],
  template: `
    <div
      class="container mx-auto my-0 min-h-dvh font-inter flex lg:justify-center lg:items-center"
    >
      <div class="w-full lg:w-1/2 h-full flex flex-col">
        <div class="w-full  mx-auto h-full flex flex-col">
          @if (showDialog()) {
            <app-success-dialog
              [camperName]="submittedCamperName()"
              [status]="submissionStatus()"
              (refreshApp)="refreshApp()"
            ></app-success-dialog>
          } @else {
            @if (isSubmitting()) {
              <div
                class="fixed inset-0 z-50 flex items-center justify-center"
                style="background-color: rgba(17, 18, 23, 0.8)"
              >
                <div
                  class="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 border-solid"
                ></div>
              </div>
            }
            <form [formGroup]="rootFormGroup">
              <div class="">
                @if (currentStep() === StepKey.Lookup && stepVisible()) {
                  <app-lookup
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                    (selectedCamper)="onSelectedCamper($event)"
                  ></app-lookup>
                }
                @if (currentStep() === StepKey.Intro && stepVisible()) {
                  <app-intro
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-intro>
                }
                @if (currentStep() === StepKey.Details && stepVisible()) {
                  <app-details
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-details>
                }
                @if (currentStep() === StepKey.LeaderApplication && stepVisible()) {
                  <app-leader-application
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-leader-application>
                }
                @if (currentStep() === StepKey.CamperInfo && stepVisible()) {
                  <app-camper-info
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-camper-info>
                }
                @if (currentStep() === StepKey.CamperAdditionalInfo && stepVisible()) {
                  <app-camp-additional-info
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-camp-additional-info>
                }
                @if (currentStep() === StepKey.Friends && stepVisible()) {
                  <app-friends
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-friends>
                }
                @if (currentStep() === StepKey.Medical && stepVisible()) {
                  <app-medical
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-medical>
                }
                @if (currentStep() === StepKey.ParentInfo && stepVisible()) {
                  <app-parent
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-parent>
                }
                @if (currentStep() === StepKey.Tshirt && stepVisible()) {
                  <app-t-shirt
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-t-shirt>
                }
                @if (currentStep() === StepKey.OtherInfo && stepVisible()) {
                  <app-other-info
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-other-info>
                }
                @if (currentStep() === StepKey.CheckData && stepVisible()) {
                  <app-summary
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                    (triggerSubmission)="fadeToStep(StepKey.CamperConsent)"
                  ></app-summary>
                }
                @if (currentStep() === StepKey.CamperConsent && stepVisible()) {
                  <app-consent-step
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                    (triggerSubmission)="onSubmit()"
                  ></app-consent-step>
                }
                @if (currentStep() === StepKey.LeaderQuestion && stepVisible()) {
                  <app-leader-info
                    [stepVisible]="stepVisible()"
                    (goToStep)="fadeToStep($event)"
                  ></app-leader-info>
                }
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class FormComponent {
  protected readonly StepKey = StepKey;
  currentStep = signal<number>(StepKey.Lookup);

  stepVisible = signal(true);
  isSubmitting = signal(false);

  rootFormGroup: FormGroup;

  private readonly http = inject(HttpClient);

  constructor(private readonly fb: FormBuilder) {
    this.rootFormGroup = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      camperCell: ['', [Validators.pattern(/^0[6-8][0-9]{8}$/)]],
      gender: ['', Validators.required],
      email: ['', [Validators.email, Validators.email]],
      age: ['', Validators.required],
      grade: ['', Validators.required],
      friends: this.fb.array([this.fb.control('')]),
      medical: [''],
      parentName: ['', Validators.required],
      parentPhone: [
        '',
        [Validators.required, Validators.pattern(/^0[6-8][0-9]{8}$/)],
      ],
      parentEmail: ['', [Validators.required, Validators.email]],
      church: ['', Validators.required],
      tshirt: ['', Validators.required],
      generalInfo: [''],
      dob: ['', Validators.required],
      // Per-child consent block — required before final submit. The
      // ConsentStepComponent gates submit until all six bools are true and
      // the medical/emergency strings are filled.
      consent_general: [false, Validators.requiredTrue],
      consent_location: [false, Validators.requiredTrue],
      consent_risk: [false, Validators.requiredTrue],
      consent_powerCamp: [false, Validators.requiredTrue],
      consent_behaviour: [false, Validators.requiredTrue],
      consent_photo: [false, Validators.requiredTrue],
      consent_emergencyName: ['', Validators.required],
      consent_emergencyContact: ['', Validators.required],
      consent_medicalAidName: ['', Validators.required],
      consent_medicalAidNumber: ['', Validators.required],
      consent_date: [new Date().toISOString().split('T')[0], Validators.required],
    });
  }

  showDialog = signal(false);
  submissionStatus = signal<'success' | 'error'>('success');
  submittedCamperName = signal('Dear Camper');



  onSubmit() {
    const raw = this.rootFormGroup.getRawValue();
    this.submittedCamperName.set(raw.firstName);

    this.isSubmitting.set(true); // start loader

    // Split the form into camper data + consent block so the backend can
    // persist the boolean checkboxes as 'accept' strings (matching the
    // existing /update contract).
    const consent = {
      general: raw.consent_general ? 'accept' : '',
      location: raw.consent_location ? 'accept' : '',
      risk: raw.consent_risk ? 'accept' : '',
      powerCamp: raw.consent_powerCamp ? 'accept' : '',
      behaviour: raw.consent_behaviour ? 'accept' : '',
      photo: raw.consent_photo ? 'accept' : '',
      emergencyName: raw.consent_emergencyName,
      emergencyContact: raw.consent_emergencyContact,
      medicalAidName: raw.consent_medicalAidName,
      medicalAidNumber: raw.consent_medicalAidNumber,
      date: raw.consent_date,
    };

    const camper: Record<string, unknown> = { ...raw };
    for (const k of Object.keys(camper)) {
      if (k.startsWith('consent_')) delete camper[k];
    }

    const url = `${environment.baseApi}/submit`;
    this.http.post(url, { camper, consent }).subscribe({
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

  onSelectedCamper(camper: { id: number; firstName: string; lastName: string; year: number }) {
    // PR 5 will replace this with sending a verification code to the parent_email
    // on file and gating the edit flow behind it.
    console.log('selected camper (PR 5 will wire this up):', camper);
  }

  fadeToStep(step: keyof typeof StepKey | number) {
    const idx = typeof step === 'number' ? step : StepKey[step];
    this.stepVisible.set(false);
    setTimeout(() => {
      this.currentStep.set(idx);
      this.stepVisible.set(true);
    }, 600);
  }

  refreshApp() {
    window.location.reload();
    this.showDialog.set(false);
  }
}
