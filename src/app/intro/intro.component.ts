import { Component, inject, input, output } from '@angular/core';
import { StepKey } from '../../models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  imports: [],
  template: `
    <div
      class="customer-wrapper"
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
<div class="w-full ">
  <p class="mt-2 text-md text-gray-500">Registration for 2025 has closed! </p>
  <p class="text-md text-gray-500">You can drop the admin staff a mail on <a [href]="'mailto:' + 'powercamplife' + '@' + 'gmail.com'" class="text-blue-600 underline">{{ 'powercamplife' + '@' + 'gmail.com' }}</a></p>
</div>
<!--      <p class="mt-2 text-md text-gray-500">-->
<!--        This form is your ticket to all the details - the what, the when, the-->
<!--        how, and all the other groovy info for Power Camp 2025.-->
<!--      </p>-->
<!--      <p class="mt-2 text-md text-gray-500">-->
<!--        Here's the deal: Each camper, even if they're from the same family, must-->
<!--        complete this form. It's your key to unlocking the adventure ahead!-->
<!--      </p>-->
      <div class="flex w-full justify-between">
<!--        <button-->
<!--          type="button"-->
<!--          (click)="goToStep.emit(StepKey.Details)"-->
<!--          class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"-->
<!--        >-->
<!--          Start Registration-->
<!--        </button>-->
        <button
          class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
          (click)="navigateToConsent()"
        >Consent form
        </button>
      </div>
    </div>
  `,
  styles: ``,
})
export class IntroComponent {
  router = inject(Router);
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;

  navigateToConsent():void {
    this.router.navigate(['consent']);
  }
}
