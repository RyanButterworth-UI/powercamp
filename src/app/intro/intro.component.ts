import { Component, input, output } from '@angular/core';
import { StepKey } from '../../models';

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
      <p class="mt-2 text-md text-gray-500">
        This form is your ticket to all the details - the what, the when, the
        how, and all the other groovy info for Power Camp 2025.
      </p>
      <p class="mt-2 text-md text-gray-500">
        Here's the deal: Each camper, even if they're from the same family, must
        complete this form. It's your key to unlocking the adventure ahead!
      </p>

      <button
        type="button"
        (click)="goToStep.emit(StepKey.Details)"
        class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
      >
        Start Registration
      </button>
    </div>
  `,
  styles: ``,
})
export class IntroComponent {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
}
