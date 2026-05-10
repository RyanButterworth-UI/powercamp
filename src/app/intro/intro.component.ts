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
      <h1 class="text-3xl font-bold mb-2">Power Camp 2026</h1>
      <div class="mb-4 flex flex-wrap gap-1.5 text-xs uppercase tracking-wide font-semibold">
        <span class="olympic-pill" style="background-color: var(--color-saga-primary-soft); border-color: var(--color-saga-primary); color: var(--color-saga-primary);">Purity</span>
        <span class="olympic-pill" style="background-color: var(--color-saga-warning-soft); border-color: var(--color-saga-warning); color: var(--color-saga-warning);">Obedience</span>
        <span class="olympic-pill" style="background-color: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.55); color: var(--color-saga-text-strong);">Worship</span>
        <span class="olympic-pill" style="background-color: var(--color-saga-action-soft); border-color: var(--color-saga-action); color: var(--color-saga-action);">Endurance</span>
        <span class="olympic-pill" style="background-color: rgba(240, 164, 164, 0.18); border-color: var(--color-saga-danger); color: var(--color-saga-danger);">Righteousness</span>
      </div>
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

        <div class="mt-5 text-sm text-gray-700 space-y-1">
          <div><span class="font-semibold">Starts:</span> Friday 31 July 2026 at 17:00</div>
          <div><span class="font-semibold">Ends:</span> Sunday 2 August 2026 at 14:00</div>
          <div><span class="font-semibold">Where:</span> YFC Magaliesburg (Boitumelo &amp; Kotula)</div>
          <div>
            <span class="font-semibold">Who:</span>
            <span class="ml-2" style="color: var(--color-saga-action); font-weight: 700;">ONLY grade 8 – grade 12</span>
          </div>
          <div>
            <span class="font-semibold">Cost:</span> R1300 (accommodation, meals, all activities, and the POWER camp T-shirt)
          </div>
          <div class="text-xs font-bold" style="color: var(--color-saga-danger)">Excludes transport to and from camp and tuck money.</div>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row w-full gap-3 mt-4">
        <button
          type="button"
          (click)="goToStep.emit(StepKey.LeaderApplication)"
          class="saga-btn saga-btn-primary"
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
