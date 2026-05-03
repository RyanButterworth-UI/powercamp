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
      <h1 class="text-3xl font-bold mb-1">Power Camp 2026</h1>
      <p class="mb-4 text-sm uppercase tracking-wide" style="color: var(--color-saga-primary-hover)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>
      <div class="w-full">
        <p class="mt-2 text-md text-gray-500">
          Power Camp 2026 runs <span class="font-semibold">Friday 31 July – Sunday 2 August 2026</span>.
          Three days of faith, fellowship, and slightly questionable camp food.
        </p>
        <p class="mt-2 text-md text-gray-500">
          This form is your ticket. Each camper — yes, even siblings —
          gets their own registration. We'll save your progress as you go,
          so if life happens you can come back and finish.
        </p>
      </div>
      <div class="flex w-full justify-between">
        <button
          type="button"
          (click)="goToStep.emit(StepKey.Details)"
          class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
        >
          Start Registration
        </button>
      </div>
    </div>
  `,
  styles: ``,
})
export class IntroComponent {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
}
