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

      <div
        class="saga-card overflow-hidden"
        style="height: min(80vh, 800px); padding: 0;"
      >
        <iframe
          src="assets/kit-list.pdf#toolbar=0&navpanes=0"
          title="Power Camp 2026 Kit List"
          class="w-full h-full"
          style="border: 0; background: white;"
        ></iframe>
      </div>

      <p class="text-xs mt-3" style="color: var(--color-saga-text-muted)">
        On mobile, your browser may open the PDF directly when you tap Download. That's fine —
        save it to Files and you'll have it offline at camp.
      </p>
    </div>
  `,
  styles: ``,
})
export class KitListComponent {}
