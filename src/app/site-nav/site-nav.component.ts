import { Component, effect, inject, signal } from '@angular/core';
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
        <a
          routerLink="/"
          class="site-logo flex items-center gap-2 no-underline"
          aria-label="Go to home"
        >
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
          >Home</a>
          <a
            routerLink="/kit-list"
            routerLinkActive="is-active"
            class="saga-tab no-underline"
          >Kit list</a>
          <a
            routerLink="/info"
            routerLinkActive="is-active"
            class="saga-tab no-underline"
          >Info</a>
          <a
            routerLink="/videos"
            routerLinkActive="is-active"
            class="saga-tab no-underline"
          >Videos</a>
          <a
            routerLink="/history"
            routerLinkActive="is-active"
            class="saga-tab no-underline"
          >History</a>
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

    </header>

    <!-- Full-screen mobile drawer. Lives outside the sticky <header> so the
         slide-in animation owns the whole viewport, not just the header
         band. The backdrop catches taps to close; the panel itself ignores
         them so taps inside the menu still work. -->
    <div
      class="md:hidden mobile-menu-overlay"
      [class.is-open]="open()"
      [attr.aria-hidden]="!open()"
      (click)="open.set(false)"
    >
      <nav
        class="mobile-menu-panel"
        (click)="$event.stopPropagation()"
        aria-label="Site navigation"
      >
        <div class="flex items-center justify-between px-5 py-4" style="border-bottom: 1px solid var(--color-saga-border);">
          <span class="font-semibold text-sm uppercase tracking-wide" style="color: var(--color-saga-text-muted)">
            Menu
          </span>
          <button
            type="button"
            class="px-2 py-1 text-sm cursor-pointer rounded"
            style="color: var(--color-saga-text-muted); background: transparent; border: 1px solid var(--color-saga-border);"
            (click)="open.set(false)"
            aria-label="Close menu"
          >Close</button>
        </div>
        <ul class="flex flex-col py-3" (click)="open.set(false)">
          <li>
            <a
              routerLink="/"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="mobile-menu-link"
            >Home</a>
          </li>
          <li>
            <a routerLink="/kit-list" routerLinkActive="is-active" class="mobile-menu-link">Kit list</a>
          </li>
          <li>
            <a routerLink="/info" routerLinkActive="is-active" class="mobile-menu-link">Info</a>
          </li>
          <li>
            <a routerLink="/videos" routerLinkActive="is-active" class="mobile-menu-link">Videos</a>
          </li>
          <li>
            <a routerLink="/history" routerLinkActive="is-active" class="mobile-menu-link">History</a>
          </li>
          <li>
            <a routerLink="/admin" routerLinkActive="is-active" class="mobile-menu-link">Admin</a>
          </li>
        </ul>
      </nav>
    </div>
  `,
  styles: [`
    .site-logo {
      transition: opacity 120ms ease;
    }
    .site-logo:hover {
      opacity: 0.85;
    }

    /* Mobile drawer — sits above the page (z 40+ to outrank the sticky
       header). The overlay handles backdrop fade; the panel itself slides
       in from the right. transform-based animation so it stays smooth on
       lower-end Android. */
    .mobile-menu-overlay {
      position: fixed;
      inset: 0;
      z-index: 40;
      pointer-events: none;
      background-color: rgba(0, 0, 0, 0);
      transition: background-color 220ms ease;
    }
    .mobile-menu-overlay.is-open {
      pointer-events: auto;
      background-color: rgba(0, 0, 0, 0.45);
    }

    .mobile-menu-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      max-width: 100vw;
      background-color: var(--color-saga-surface);
      border-left: 1px solid var(--color-saga-border);
      transform: translateX(100%);
      transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1);
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .mobile-menu-overlay.is-open .mobile-menu-panel {
      transform: translateX(0);
    }

    .mobile-menu-link {
      display: block;
      padding: 0.875rem 1.25rem;
      font-size: 15px;
      color: var(--color-saga-text);
      text-decoration: none;
      border-bottom: 1px solid var(--color-saga-border);
    }
    .mobile-menu-link:hover {
      background-color: var(--color-saga-surface-2);
    }
    .mobile-menu-link.is-active {
      color: var(--color-saga-text-strong);
      font-weight: 600;
      border-left: 3px solid var(--color-saga-action);
      background-color: var(--color-saga-action-soft);
      padding-left: calc(1.25rem - 3px);
    }
  `],
})
export class SiteNavComponent {
  open = signal(false);
  private readonly router = inject(Router);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't move when the user scrolls inside the menu. Restored on close.
  constructor() {
    if (typeof document !== 'undefined') {
      let prevOverflow = '';
      effect(() => {
        if (this.open()) {
          prevOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = prevOverflow;
        }
      });
    }
  }
}
