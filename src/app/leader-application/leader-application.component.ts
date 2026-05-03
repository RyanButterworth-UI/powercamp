import { Component, input, output } from '@angular/core';
import { StepKey } from '../../models';

@Component({
  selector: 'app-leader-application',
  imports: [],
  template: `
    <div
      class="customer-wrapper"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <fieldset>
        <legend class="text-sm/6 font-semibold text-gray-900">
          Leadship Application
        </legend>
        <p class="mt-1 text-sm/6 text-gray-600">
          Are you Applying as a leader for the camp?
        </p>
        <div
          class="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:space-x-10"
        >
          <div class="flex items-center">
            <input
              (change)="trackChange(true)"
              id="email"
              name="notification-method"
              type="radio"
              class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
            />
            <label
              for="email"
              class="ml-3 block text-sm/6 font-medium text-gray-900"
              >Yes</label
            >
          </div>
          <div class="flex items-center">
            <input
              (change)="trackChange(false)"
              id="sms"
              name="notification-method"
              type="radio"
              class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
            />
            <label
              for="sms"
              class="ml-3 block text-sm/6 font-medium text-gray-900"
              >No</label
            >
          </div>
        </div>
      </fieldset>
    </div>
  `,
  styles: ``,
})
export class LeaderApplicationComponent {
  trackChange(value: boolean) {
    this.goToStep.emit(value ? StepKey.LeaderQuestion : StepKey.CamperInfo);
  }
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
}
