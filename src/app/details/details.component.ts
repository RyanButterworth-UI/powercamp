import { Component, input, output } from '@angular/core';
import { StepKey } from '../../models';

@Component({
  selector: 'app-details',
  imports: [],
  template: `
    <div
      class="customer-wrapper"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <h2 class="text-xl font-bold mb-3">Camp Details</h2>
      <div class="mb-4 text-md text-gray-700 space-y-2">
        <div>
          <span class="font-semibold">Starts:</span> Friday 31 July 2026 at 17:00
        </div>
        <div>
          <span class="font-semibold">Ends:</span> Sunday 2 August 2026 at 14:00
        </div>
        <div>
          <span class="font-semibold">Where:</span> YFC Magaliesburg (Boitumelo
          & Kotula)
        </div>
        <div>
          <span class="font-semibold">Who:</span>
          <span class="text-blue-700 font-bold">ONLY grade 8 - grade 12</span>
        </div>
        <div>
          <span class="font-semibold">Cost:</span> R1300 (accommodation, meals,
          all activities, and the POWER camp T-shirt)
        </div>
        <div class="text-xs">
          Excludes transport to and from camp and tuck money.
        </div>
      </div>
      <div class="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          type="button"
          (click)="goToStep.emit(StepKey.LeaderApplication)"
          class="saga-btn saga-btn-primary"
        >
          Let me Register already!
        </button>
      </div>
    </div>
  `,
  styles: ``,
})
export class DetailsComponent {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
}
