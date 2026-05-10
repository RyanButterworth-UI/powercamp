import { Component } from '@angular/core';

@Component({
  selector: 'app-kit-list',
  standalone: true,
  template: `
    <div class="container mx-auto p-6 max-w-4xl">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 class="text-2xl font-bold mb-1">Power Camp 2026 Kit List</h1>
          <p class="text-sm" style="color: var(--color-saga-text-muted)">
            Everything to throw in the bag — preview below, or download the PDF.
          </p>
        </div>
        <a
          href="assets/kit-list.pdf"
          download
          class="saga-btn saga-btn-primary no-underline"
        >
          ⬇ Download PDF
        </a>
      </div>

      <!-- Desktop: inline PDF preview. iOS Safari and most mobile browsers
           refuse to render PDFs inside <iframe> (they show a grey/black box
           or download instead), so we hide this on small screens and offer
           a tap-to-open card below. -->
      <div
        class="saga-card overflow-hidden hidden sm:block"
        style="height: min(80vh, 800px); padding: 0;"
      >
        <iframe
          src="assets/kit-list.pdf#toolbar=0&navpanes=0"
          title="Power Camp 2026 Kit List"
          class="w-full h-full"
          style="border: 0; background: white;"
        ></iframe>
      </div>

      <!-- Mobile: a clear tap-to-open card. The browser handles the PDF in
           its native viewer (iOS Safari opens it inline, Chrome / Firefox
           offer save / open externally). Avoids the broken-iframe black box. -->
      <a
        href="assets/kit-list.pdf"
        target="_blank"
        rel="noopener"
        class="saga-card sm:hidden flex items-center gap-3 p-4 no-underline"
        style="color: var(--color-saga-text);"
      >
        <span
          class="inline-flex items-center justify-center rounded-md shrink-0"
          style="width: 44px; height: 44px; background: var(--color-saga-action-soft); border: 1px solid var(--color-saga-action); color: var(--color-saga-action);"
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </span>
        <span class="flex-1">
          <span class="block text-sm font-semibold" style="color: var(--color-saga-text-strong)">
            Open the kit list PDF
          </span>
          <span class="block text-xs" style="color: var(--color-saga-text-muted)">
            Opens in your browser's PDF viewer — save it to Files for offline use at camp.
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-saga-text-muted); flex-shrink: 0;">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>

      <p class="text-xs mt-3 hidden sm:block" style="color: var(--color-saga-text-muted)">
        Tap Download for an offline copy you can keep with your packing.
      </p>
    </div>
  `,
  styles: ``,
})
export class KitListComponent {}
