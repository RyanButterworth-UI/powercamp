import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-site-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header
      class="sticky top-0 z-30 backdrop-blur"
      style="background-color: rgba(17, 18, 23, 0.78); border-bottom: 1px solid var(--color-saga-border);"
    >
      <div class="container mx-auto flex items-center justify-between px-4 py-3">
        <a routerLink="/" class="flex items-center gap-2 no-underline">
          <span
            class="inline-flex items-center justify-center rounded-full font-bold"
            style="width: 28px; height: 28px; background-color: var(--color-saga-primary); color: white; font-size: 13px;"
          >P</span>
          <span class="font-semibold text-sm" style="color: var(--color-saga-text-strong)">
            Power Camp
          </span>
          <span class="hidden sm:inline text-xs" style="color: var(--color-saga-text-muted)">
            · 2026
          </span>
        </a>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1 text-sm">
          <a
            routerLink="/"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="saga-tab no-underline"
          >Register</a>
          <a
            href="https://powercamp.co.za"
            target="_blank"
            rel="noopener noreferrer"
            class="saga-tab no-underline"
          >Info ↗</a>
          <a
            routerLink="/admin"
            routerLinkActive="is-active"
            class="saga-tab no-underline"
          >Admin</a>
        </nav>

        <!-- Mobile hamburger -->
        <button
          type="button"
          class="md:hidden p-2 rounded"
          style="color: var(--color-saga-text); border: 1px solid var(--color-saga-border);"
          (click)="open.set(!open())"
          [attr.aria-expanded]="open()"
          aria-label="Toggle navigation"
        >
          @if (open()) {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          } @else {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          }
        </button>
      </div>

      <!-- Mobile drawer -->
      @if (open()) {
        <nav
          class="md:hidden flex flex-col px-4 py-2 gap-1 text-sm"
          style="border-top: 1px solid var(--color-saga-border);"
          (click)="open.set(false)"
        >
          <a
            routerLink="/"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="saga-tab no-underline"
          >Register / Update</a>
          <a
            href="https://powercamp.co.za"
            target="_blank"
            rel="noopener noreferrer"
            class="saga-tab no-underline"
          >Info ↗</a>
          <a
            routerLink="/admin"
            routerLinkActive="is-active"
            class="saga-tab no-underline"
          >Admin</a>
        </nav>
      }
    </header>
  `,
  styles: ``,
})
export class SiteNavComponent {
  open = signal(false);
  private readonly router = inject(Router);
}
