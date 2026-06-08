import { CommonModule } from '@angular/common';
import { Component, input, Input, output } from '@angular/core';

@Component({
  selector: 'app-success-dialog',
  imports: [CommonModule],
  template: `
    <div class="relative z-10" role="dialog" aria-modal="true">
      <!-- Dark backdrop on dark theme. -->
      <div class="fixed inset-0 transition-opacity" style="background-color: rgba(17, 18, 23, 0.85)" aria-hidden="true"></div>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="saga-card relative transform overflow-hidden px-4 pt-5 pb-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
            <div>
              <div
                class="mx-auto flex size-12 items-center justify-center rounded-full"
                [ngClass]="status === 'success' ? '' : ''"
                [style.backgroundColor]="status === 'success' ? 'rgba(78, 192, 125, 0.18)' : 'var(--color-saga-danger-soft)'"
              >
                <svg
                  *ngIf="status === 'success'; else errorIcon"
                  class="size-6"
                  [style.color]="'var(--color-saga-success)'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <ng-template #errorIcon>
                  <svg
                    class="size-6"
                    [style.color]="'var(--color-saga-danger)'"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </ng-template>
              </div>

              <div class="mt-4 text-center">
                <h3 class="text-lg font-semibold">
                  @if (!consent() && !feedback()) {
                    {{ status === 'success' ? "You're in!" : (errorTitle || "Hmm, that didn't go through") }}
                  } @else if (feedback()) {
                    {{ status === 'success' ? 'Got it — thank you!' : "We didn't catch that" }}
                  } @else {
                    {{ status === 'success' ? 'Consent recorded' : 'Consent didn’t save' }}
                  }
                </h3>
                <div class="mt-2 text-sm" style="color: var(--color-saga-text-muted)">
                  @if (!consent() && !feedback()) {
                    @if (status === 'success') {
                      <p>
                        {{ camperName }}, your spot at Power Camp 2026 is provisionally held. We'll
                        confirm once payment lands. Check your inbox for the receipt.
                      </p>
                      <p class="mt-2 text-xs" style="color: var(--color-saga-text-muted)">
                        Parent and camper emails have been added to the Power Camp mailing
                        list. Every campaign email has a one-click unsubscribe.
                      </p>
                      <p class="mt-2">If you have another child to register, hit the button below — we'll keep your parent details prefilled.</p>
                    } @else if (errorMessage) {
                      <p>{{ errorMessage }}</p>
                    } @else {
                      <p>
                        {{ camperName }}, our gremlins ate that submission. Try again, and if it
                        keeps grumbling, give us a shout.
                      </p>
                    }
                  } @else if (feedback()) {
                    <p>
                      {{ status === 'success' ? camperName + ", thanks for taking the time. Future-you (and us) appreciates it." : camperName + ", the feedback didn't go through. One more try?" }}
                    </p>
                  } @else {
                    <p>
                      {{ status === 'success' ? camperName + ', consent saved. You\'re cleared for adventure.' : camperName + ", that consent didn't save. Try again or give us a shout." }}
                    </p>
                  }
                </div>
              </div>
            </div>

            <div class="mt-5 flex flex-col sm:flex-row gap-2">
              @if (status === 'success' && !consent() && !feedback()) {
                <button
                  type="button"
                  class="saga-btn saga-btn-secondary w-full sm:flex-1"
                  (click)="registerAnother.emit()"
                >
                  Register another child
                </button>
              }
              <button
                type="button"
                class="saga-btn saga-btn-primary w-full sm:flex-1"
                (click)="refreshApp.emit()"
              >
                {{ status === 'success' ? "We're done" : 'Please try again' }}
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
  // Optional overrides for specific error cases (e.g. the /submit 409
  // "already registered" response). When set, they replace the generic
  // "gremlins ate it" copy so the parent gets actionable guidance instead
  // of a retry loop.
  @Input() errorTitle = '';
  @Input() errorMessage = '';
  consent = input<boolean>(false);
  feedback = input<boolean>(false);
  refreshApp = output();
  registerAnother = output();
}
