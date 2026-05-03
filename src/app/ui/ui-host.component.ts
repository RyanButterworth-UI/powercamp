import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from './ui.service';

@Component({
  selector: 'app-ui-host',
  standalone: true,
  imports: [CommonModule],
  template: `
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
  `,
  styles: ``,
})
export class UiHostComponent {
  ui = inject(UiService);
}
