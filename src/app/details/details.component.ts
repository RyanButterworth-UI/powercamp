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
      <h2 class="text-2xl font-bold mb-4 text-gray-900">Camp Details</h2>
      <div class="mb-4 text-md text-gray-700 space-y-2">
        <div>
          <span class="font-semibold">Starts:</span> Friday 22nd August at 14:00
        </div>
        <div>
          <span class="font-semibold">Ends:</span> Sunday 24th August at 14:00
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
        <div class="text-xs text-gray-500">
          Excludes transport to and from camp and tuck money.
        </div>
      </div>
      <button
        type="button"
        (click)="goToStep.emit(StepKey.CamperInfo)"
        class="rounded-full bg-white mt-4 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
      >
        Let me Register already!
      </button>
    </div>
  `,
  styles: ``,
})
export class DetailsComponent {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
}
