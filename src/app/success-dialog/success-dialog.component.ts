import { CommonModule } from '@angular/common';
import { Component,input, Input, output } from '@angular/core';

@Component({
  selector: 'app-success-dialog',
  imports: [CommonModule],
  template: `
    <!-- success-dialog.component.html -->
    <div class="relative z-10" role="dialog" aria-modal="true">
      <!-- backdrop -->
      <div
        class="fixed inset-0 bg-gray-500/75 transition-opacity"
        aria-hidden="true"
      ></div>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div
          class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
        >
          <div
            class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6"
          >
            <div>
              <div
                class="mx-auto flex size-12 items-center justify-center rounded-full"
                [ngClass]="status === 'success' ? 'bg-green-100' : 'bg-red-100'"
              >
                <svg
                  *ngIf="status === 'success'; else errorIcon"
                  class="size-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
                <ng-template #errorIcon>
                  <svg
                    class="size-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </ng-template>
              </div>
              <div class="mt-3 text-center sm:mt-5">
                <h3 class="text-base font-semibold text-gray-900">
                  @if (!consent() && !feedback()) {
                    {{
                      status === 'success'
                        ? 'Registration Successful'
                        : 'Registration Failed'
                    }}
                  } @else if (feedback()) {
                    {{
                      status === 'success'
                        ? 'Feedback Submitted'
                        : 'Feedback Submission Failed'
                    }}
                  } @else {
                    {{
                      status === 'success'
                        ? 'Consent Capture Successful'
                        : 'Consent Capture Failed'
                    }}
                  }
                </h3>
                <div class="mt-2">
                  @if (!consent() && !feedback()) {
                    <p class="text-sm">
                      {{
                        status === 'success'
                          ? camperName +
                          ', your registration for Power Camp Winter 2025 has been recorded successfully. Get ready for a season of faith, fellowship, and unforgettable winter adventure!'
                          : camperName +
                          ', there was a problem submitting your registration for Power Camp Winter 2025. Please try again or contact us if the issue continues.'
                      }}
                    </p>
                  } @else if (feedback()) {
                    <p class="text-sm text-gray-700">
                      {{
                        status === 'success'
                          ? camperName + ', thank you for your feedback on Power Camp 2025! We appreciate your input.'
                          : camperName + ', there was a problem submitting your feedback. Please try again or contact us if the issue continues.'
                      }}
                    </p>
                  } @else {
                    {{
                      status === 'success'
                        ? camperName + ', we have successfully received your consent for Power Camp 2025. Thank you!'
                        : camperName + ', there was a problem submitting your consent. Please try again or contact us if the issue continues.'
                    }}
                  }
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6">
              <button
                type="button"
                class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                (click)="refreshApp.emit()"
              >
                {{
                  status === 'success' ? 'Return To Start' : 'Please try Again'
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class SuccessDialogComponent {
  @Input() camperName = '';
  @Input() status: 'success' | 'error' = 'success';
  consent = input<boolean>(false);
  feedback = input<boolean>(false);
  refreshApp = output();
}
