import { Component, input } from '@angular/core';

/**
 * Page-level ghost: a centred spinner that fills the route's main column
 * for the first ~300 ms after a page mounts. Gives the layout a beat to
 * settle so the user never sees a flash of unstyled / half-loaded content,
 * and announces "we're working on it" on slow networks.
 *
 * Pair with a `ready = signal(false)` + `setTimeout(() => ready.set(true),
 * 300)` in each route component, and gate the real content on `ready()`.
 */
@Component({
  selector: 'app-page-ghost',
  standalone: true,
  template: `
    <div class="flex items-center justify-center" [style.minHeight]="height()">
      <div
        class="animate-spin rounded-full"
        style="
          width: 36px;
          height: 36px;
          border: 3px solid var(--color-saga-border);
          border-top-color: var(--color-saga-action);
        "
        role="status"
        aria-label="Loading"
      ></div>
    </div>
  `,
})
export class PageGhostComponent {
  // Tunable so admin-table pages can fill more vertical space than a
  // small marketing page. Default sized for typical mid-page loading.
  height = input<string>('40vh');
}
