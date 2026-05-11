import { Component, signal } from '@angular/core';
import { PageGhostComponent } from '../skeleton/page-ghost.component';

@Component({
  selector: 'app-kit-list',
  standalone: true,
  imports: [PageGhostComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-6 max-w-4xl page-fade-in">
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
          Download PDF
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
        class="saga-card sm:hidden block p-4 no-underline"
        style="color: var(--color-saga-text);"
      >
        <span class="block text-sm font-semibold" style="color: var(--color-saga-text-strong)">
          Open the kit list PDF
        </span>
        <span class="block text-xs mt-1" style="color: var(--color-saga-text-muted)">
          Opens in your browser's PDF viewer — save it to Files for offline use at camp.
        </span>
      </a>

      <p class="text-xs mt-3 hidden sm:block" style="color: var(--color-saga-text-muted)">
        Tap Download for an offline copy you can keep with your packing.
      </p>
    </div>
    }
  `,
  styles: ``,
})
export class KitListComponent {
  ready = signal(false);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
  }
}
