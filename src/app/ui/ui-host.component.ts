import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from './ui.service';

@Component({
  selector: 'app-ui-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Global loading spinner — visible whenever any /api/* request is in flight
         for longer than the grace period, so quick (<200ms) requests don't flash. -->
    @if (showSpinner()) {
      <div
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 saga-card flex items-center gap-2 px-3 py-2 shadow-lg pointer-events-none"
        role="status"
        aria-live="polite"
        data-testid="global-loading"
      >
        <span
          class="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
          [style.borderColor]="'var(--color-saga-border-strong)'"
          [style.borderTopColor]="'transparent'"
        ></span>
        <span class="text-xs" style="color: var(--color-saga-text-muted)">Loading…</span>
      </div>
    }

    <!-- Toasts -->
    <div
      class="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      style="max-width: min(320px, calc(100vw - 2rem));"
    >
      @for (t of ui.toasts(); track t.id) {
        <div
          class="saga-card pointer-events-auto px-4 py-3 text-sm shadow-lg flex items-start gap-3"
          [style.borderColor]="
            t.kind === 'success' ? 'var(--color-saga-success)'
            : t.kind === 'error' ? 'var(--color-saga-danger)'
            : 'var(--color-saga-primary)'
          "
        >
          <span
            class="text-xs mt-0.5"
            [style.color]="
              t.kind === 'success' ? 'var(--color-saga-success)'
              : t.kind === 'error' ? 'var(--color-saga-danger)'
              : 'var(--color-saga-primary)'
            "
          >
            {{ t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'ℹ' }}
          </span>
          <span class="flex-1" style="color: var(--color-saga-text)">{{ t.text }}</span>
          <button
            type="button"
            (click)="ui.dismiss(t.id)"
            class="text-xs cursor-pointer"
            style="background: none; border: none; color: var(--color-saga-text-muted)"
            aria-label="Dismiss"
          >×</button>
        </div>
      }
    </div>

    <!-- Confirm modal -->
    @if (ui.confirmRequest(); as req) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background-color: rgba(17, 18, 23, 0.85);"
      >
        <div class="saga-card p-6 max-w-md w-full">
          <p class="text-sm mb-5" style="color: var(--color-saga-text)">{{ req.text }}</p>
          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              (click)="ui.resolveConfirm(false)"
              class="saga-btn saga-btn-secondary"
            >{{ req.cancelLabel }}</button>
            <button
              type="button"
              (click)="ui.resolveConfirm(true)"
              class="saga-btn saga-btn-primary"
            >{{ req.confirmLabel }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Prompt modal (text/email/password input) -->
    @if (ui.promptRequest(); as req) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background-color: rgba(17, 18, 23, 0.85);"
      >
        <div class="saga-card p-6 max-w-md w-full">
          <p class="text-sm mb-3" style="color: var(--color-saga-text)">{{ req.text }}</p>
          <input
            #promptInput
            [type]="req.inputType"
            [value]="req.defaultValue"
            [placeholder]="req.placeholder"
            (keyup.enter)="ui.resolvePrompt(promptInput.value)"
            (keyup.escape)="ui.resolvePrompt(null)"
            class="rounded-lg w-full px-3 py-2 mb-4"
          />
          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              (click)="ui.resolvePrompt(null)"
              class="saga-btn saga-btn-secondary"
            >{{ req.cancelLabel }}</button>
            <button
              type="button"
              (click)="ui.resolvePrompt(promptInput.value)"
              class="saga-btn saga-btn-primary"
            >{{ req.confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: ``,
})
export class UiHostComponent {
  ui = inject(UiService);

  // 200ms grace before the spinner appears so requests that come back quickly
  // don't cause a flash. Goes back to false the instant loading drops to 0.
  private static readonly SHOW_DELAY_MS = 200;
  showSpinner = signal(false);
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const active = this.ui.loading() > 0;
      if (active) {
        if (this.showTimer === null && !this.showSpinner()) {
          this.showTimer = setTimeout(() => {
            this.showSpinner.set(true);
            this.showTimer = null;
          }, UiHostComponent.SHOW_DELAY_MS);
        }
      } else {
        if (this.showTimer !== null) {
          clearTimeout(this.showTimer);
          this.showTimer = null;
        }
        this.showSpinner.set(false);
      }
    });
  }
}
