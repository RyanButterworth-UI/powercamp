import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IntroComponent } from './intro/intro.component';
import { CampFormData } from '../models';
import { DetailsComponent } from './details/details.component';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CamperInfoComponent } from './camper-info/camper-info.component';
import { CampAdditionalInfoComponent } from './camp-additional-info/camp-additional-info.component';
import { FriendsComponent } from './friends/friends.component';
import { StepKey } from '../models';
import { MedicalComponent } from './medical/medical.component';
import { ParentComponent } from './parent/parent.component';
import { TShirtComponent } from './t-shirt/t-shirt.component';
import { OtherInfoComponent } from './other-info/other-info.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IntroComponent,
    DetailsComponent,
    CamperInfoComponent,
    CampAdditionalInfoComponent,
    FriendsComponent,
    MedicalComponent,
    ParentComponent,
    TShirtComponent,
    OtherInfoComponent,
  ],
  template: `
    <div class="container mx-auto bg:white lg:bg-slate-100 my-0 h-screen">
      <div class="w-full lg:w-1/2 mx-auto">
        <form [formGroup]="rootFormGroup" (ngSubmit)="onSubmit()">
          <div class="">
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
            @if (currentStep() === StepKey.CamperInfo) {
              <app-camper-info
                [stepVisible]="stepVisible()"
                (goToStep)="fadeToStep($event)"
              ></app-camper-info>
            }
            @if (
              currentStep() === StepKey.CamperAdditionalInfo && stepVisible()
            ) {
              <app-camp-additional-info
                [stepVisible]="stepVisible()"
                (goToStep)="fadeToStep($event)"
              >
              </app-camp-additional-info>
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
              >
              </app-t-shirt>
            }

            @if (currentStep() === StepKey.OtherInfo && stepVisible()) {
              <app-other-info
                [stepVisible]="stepVisible()"
                (goToStep)="fadeToStep($event)"
              ></app-other-info>
            }
            @if (currentStep() === StepKey.CheckData && stepVisible()) {
              <div>
                <pre>{{ rootFormGroup.getRawValue() | json }}</pre>
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
  currentStep = signal<number>(StepKey.Intro);
  StepKey = StepKey;

  stepVisible = signal(true);
  rootFormGroup: FormGroup;

  private http = inject(HttpClient);

  constructor(private fb: FormBuilder) {
    this.rootFormGroup = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      camperCell: ['', Validators.pattern(/^0[6-8][0-9]{8}$/)],
      gender: ['', Validators.required],
      email: ['', [Validators.email, Validators.email]],
      age: ['', Validators.required],
      grade: ['', Validators.required],
      friends: this.fb.array([this.fb.control('')]),
      medical: [''],
      parentName: ['', Validators.required],
      parentPhone: [
        '',
        Validators.required,
        Validators.pattern(/^0[6-8][0-9]{8}$/),
      ],
      parentEmail: ['', [Validators.required, Validators.email]],
      church: ['', Validators.required],
      tshirt: ['', Validators.required],
      generalInfo: [''],
      dob: ['', Validators.required],
    });
  }

  nextStep() {
    if (this.currentStep() < 13) this.currentStep.update((v) => v + 1);
  }
  prevStep() {
    if (this.currentStep() > 1) this.currentStep.update((v) => v - 1);
  }

  onSubmit() {
    const data = this.rootFormGroup.getRawValue();

    console.log('Sending to local Node server:', data);

    const url = 'http://localhost:3000/submit'; // hitting YOUR node backend

    this.http.post(url, data).subscribe({
      next: (response) => {
        console.log('Server response:', response);
        alert('Submitted successfully!');
      },
      error: (err: any) => {
        console.error('Error:', err);
        alert('Something went wrong.');
      },
    });
  }

  fadeToStep(step: keyof typeof StepKey | number) {
    const idx = typeof step === 'number' ? step : StepKey[step];
    this.stepVisible.set(false);
    setTimeout(() => {
      this.currentStep.set(idx);
      this.stepVisible.set(true);
    }, 700);
  }
}
