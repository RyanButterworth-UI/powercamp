import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageGhostComponent } from '../skeleton/page-ghost.component';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [RouterLink, PageGhostComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-6 max-w-3xl page-fade-in">
      <h1 class="text-3xl font-bold mb-1">About Power Camp</h1>
      <p class="text-sm uppercase tracking-wide mb-6" style="color: var(--color-saga-primary-hover)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>

      <div class="saga-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-2">When &amp; where</h2>
        <p class="text-sm mb-1" style="color: var(--color-saga-text-muted)">
          Friday 31 July → Sunday 2 August 2026
        </p>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          YFC Magaliesburg — Boitumelo &amp; Kotula
        </p>
      </div>

      <div class="saga-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-2">Who it's for</h2>
        <p class="text-sm mb-2" style="color: var(--color-saga-text-muted)">
          Grades 8 through 12. We also have a leader programme for 18+ — applications gated by a
          portal password. Talk to your camp coordinator if you're interested.
        </p>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          Cost is R1300 — accommodation, all meals, every activity, and the official camp T-shirt.
          You bring transport, tuck money, and a sense of adventure.
        </p>
      </div>

      <div class="saga-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-2">What to bring</h2>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          Sleeping bag, warm clothes, closed shoes, Bible, notebook, water bottle, torch, and a
          willingness to embrace early mornings. Full list on the
          <a routerLink="/kit-list" style="color: var(--color-saga-primary)">Kit list</a>
          page (link in the top menu).
        </p>
      </div>

      <div class="saga-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-2">A bit of history</h2>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          Power Camp has been running since 2007 — a long line of campers, leaders, late-night
          conversations, terrible-but-loved camp food, and lifelong friendships. We're glad you're
          here.
        </p>
      </div>

      <div class="text-center mt-8">
        <a routerLink="/" class="saga-btn saga-btn-primary no-underline">
          Register for 2026
        </a>
      </div>
    </div>
    }
  `,
  styles: ``,
})
export class InfoComponent {
  ready = signal(false);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
  }
}
