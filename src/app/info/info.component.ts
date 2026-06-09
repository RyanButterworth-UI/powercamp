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
          Grades 8 through 12. We also run a leader programme for 18+, but our 2026 leadership team
          is now full of great leaders, so leader applications are closed for this year.
        </p>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          Cost is R1350 — accommodation, all meals, every activity, and the official camp T-shirt.
          You bring transport, tuck money, and a sense of adventure.
        </p>
      </div>

      <div class="saga-card p-6 mb-6">
        <details data-testid="payment-details">
          <summary class="text-lg font-semibold cursor-pointer">Payment details</summary>
          <p class="text-sm mt-3 mb-3" style="color: var(--color-saga-text-muted)">
            Your spot is provisionally held and confirmed once payment of
            <span class="font-semibold">R1350</span> is received. Please use the reference below so we
            can match your payment to your registration.
          </p>
          <dl class="text-sm grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5">
            <dt style="color: var(--color-saga-text-muted)">Account name</dt><dd>Brackenhurst Baptist Church</dd>
            <dt style="color: var(--color-saga-text-muted)">Account number</dt><dd>6201 2474 136</dd>
            <dt style="color: var(--color-saga-text-muted)">Account type</dt><dd>Current</dd>
            <dt style="color: var(--color-saga-text-muted)">Bank</dt><dd>First National Bank</dd>
            <dt style="color: var(--color-saga-text-muted)">Branch code</dt><dd>252 242</dd>
            <dt style="color: var(--color-saga-text-muted)">Reference</dt><dd>PC26 &lt;FirstName&gt; &lt;Surname&gt;</dd>
          </dl>
          <p class="text-xs mt-3" style="color: var(--color-saga-text-muted)">
            Replace &lt;FirstName&gt; &lt;Surname&gt; with the camper's name, e.g. <span class="font-mono">PC26 John Smith</span>.
          </p>
        </details>
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
