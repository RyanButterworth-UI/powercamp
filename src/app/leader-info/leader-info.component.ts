import { Component, computed, input, output, signal } from '@angular/core';
import { StepKey } from '../../models';

@Component({
  selector: 'app-leader-info',
  imports: [],
  template: `
    <div
      class="customer-wrapper bg-white"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <div class="overflow-hidden rounded-lg bg-white shadow-sm">
        <div class="px-4 py-5 sm:p-6">
          <!-- Content goes here -->

          <fieldset>
            <legend class="text-sm/6 font-semibold text-gray-900">
              School Status
            </legend>
            <p class="mt-1 text-sm/6 text-gray-600">
              Have you been out of school for more than a year?
            </p>
            <div
              class="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:space-x-10"
            >
              <div class="flex items-center">
                <input
                  (change)="outOfSchool.set(true); outofSchoolTouched.set(true)"
                  [disabled]="outofSchoolTouched()"
                  id="school-yes"
                  name="school-status"
                  type="radio"
                  class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                />
                <label
                  for="school-yes"
                  class="ml-3 block text-sm/6 font-medium text-gray-900"
                  >Yes</label
                >
              </div>
              <div class="flex items-center">
                <input
                  (change)="
                    outOfSchool.set(false); outofSchoolTouched.set(true)
                  "
                  [disabled]="outofSchoolTouched()"
                  id="school-no"
                  name="school-status"
                  type="radio"
                  class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                />
                <label
                  for="school-no"
                  class="ml-3 block text-sm/6 font-medium text-gray-900"
                  >No</label
                >
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      @if (outOfSchool() !== null) {
        <div class="overflow-hidden rounded-lg bg-white shadow-sm mt-2">
          <div class="px-4 py-5 sm:p-6">
            <fieldset>
              <legend class="text-sm/6 font-semibold text-gray-900">
                Church involvement
              </legend>
              <p class="mt-1 text-sm/6 text-gray-600">
                Are you part of a local church community and actively involved
                in ministry?
              </p>
              <div
                class="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:space-x-10"
              >
                <div class="flex items-center">
                  <input
                    (change)="
                      churchInvolvement.set(true);
                      churchInvolvementTouched.set(true)
                    "
                    [disabled]="churchInvolvementTouched()"
                    id="church-yes"
                    name="church-involvement"
                    type="radio"
                    class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                  />
                  <label
                    for="church-yes"
                    class="ml-3 block text-sm/6 font-medium text-gray-900"
                    >Yes</label
                  >
                </div>
                <div class="flex items-center">
                  <input
                    (change)="
                      churchInvolvement.set(false);
                      churchInvolvementTouched.set(true)
                    "
                    [disabled]="churchInvolvementTouched()"
                    id="church-no"
                    name="church-involvement"
                    type="radio"
                    class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                  />
                  <label
                    for="church-no"
                    class="ml-3 block text-sm/6 font-medium text-gray-900"
                    >No</label
                  >
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      }
      @if (outOfSchool() !== null && churchInvolvement() !== null) {
        <div class="overflow-hidden rounded-lg bg-white shadow-sm mt-2">
          <div class="px-4 py-5 sm:p-6">
            @if (!outOfSchool() || !churchInvolvement()) {
              <p>
                We regret to inform you that you don't meet the requirements for
                being a leader at this time. If you believe you still have what
                it takes, please don't hesitate to reach out to us at
                <a
                  href="mailto:powercamplife&#64;gmail.com"
                  class="text-blue-600 underline"
                >
                  powercamplife&#64;gmail.com </a
                >. We value your enthusiasm and commitment, and we're here to
                support you in any way we can. Thank you for your understanding.
              </p>
            } @else if (outOfSchool() && churchInvolvement()) {
              <p>
                Please email
                <a
                  href="mailto:neil.cable&#64;wol.co.za"
                  class="text-blue-600 underline"
                  >neil.cable&#64;wol.co.za</a
                >
                with the following details:<br />
                - Current church<br />
                - Your involvement in the church<br />
                - Reasons for wanting to be a leader.<br /><br />
                Neil will reply to you directly.
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class LeaderInfoComponent {
  outOfSchool = signal<boolean | null>(null);
  outofSchoolTouched = signal<boolean>(false);
  churchInvolvement = signal<boolean | null>(null);
  churchInvolvementTouched = signal<boolean>(false);
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
}
