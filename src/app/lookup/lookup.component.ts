import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LookupResult, StepKey } from '../../models';
import { environment } from '../../environments/environment';
import { UiService } from '../ui/ui.service';
import { SkeletonComponent } from '../skeleton/skeleton.component';

interface StatsResponse {
  year: number;
  campers: number;
  leaders: number;
  total: number;
  cap: number;
  remaining: number;
}

@Component({
  selector: 'app-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SkeletonComponent],
  template: `
    <div
      class="customer-wrapper p-6"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <h1 class="text-3xl font-bold mb-1">Power Camp 2026</h1>
      <p class="mb-1 text-sm" style="color: var(--color-saga-text-muted)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>
      <p class="mb-4 text-sm" style="color: var(--color-saga-text-muted)">
        Been to Power Camp before? Search for your name and we'll pick up where you left off.
        Registering also adds you to our mailing list (one-click unsubscribe on every email).
      </p>

      <!-- Capacity widget. While /stats is in flight we render a skeleton
           with the same footprint as the real card so the layout doesn't
           jump when the data arrives. If the call fails altogether the
           widget collapses — it's a nice-to-have, not a blocker. -->
      @if (statsLoading()) {
        <div
          class="mb-4 p-3 rounded-lg"
          style="background-color: var(--color-saga-surface-2); border: 1px solid var(--color-saga-border);"
          data-testid="stats-skeleton"
        >
          <div class="flex items-center justify-between gap-3 flex-wrap mb-1.5">
            <app-skeleton width="9rem" height="14px" />
            <app-skeleton width="7.5rem" height="22px" />
          </div>
          <app-skeleton width="80%" height="11px" />
          <app-skeleton shape="block" width="100%" height="6px" />
        </div>
      } @else if (stats()) {
        <div
          class="mb-4 p-3 rounded-lg flex items-start gap-3"
          style="background-color: var(--color-saga-surface-2); border: 1px solid var(--color-saga-border);"
        >
          <div class="flex-1">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="text-sm font-semibold" style="color: var(--color-saga-text-strong)">
                {{ stats()!.total }} of {{ stats()!.cap }} spots booked
              </div>
              <button
                type="button"
                (click)="share()"
                class="saga-btn saga-btn-secondary !py-1 !px-2.5 !text-xs"
                data-testid="share-link"
              >
                Share with a friend
              </button>
            </div>
            <div class="text-xs mt-0.5" style="color: var(--color-saga-text-muted)">
              Space is limited — once we hit {{ stats()!.cap }} we'll close registration. Don't leave it for the last week.
            </div>
            <div
              class="mt-2 h-1.5 rounded-full overflow-hidden"
              style="background-color: var(--color-saga-border)"
            >
              <div
                class="h-full rounded-full"
                [style.width.%]="capPercent()"
                [style.background-color]="
                  capPercent() > 85 ? 'var(--color-saga-danger)' : 'var(--color-saga-action)'
                "
              ></div>
            </div>
          </div>
        </div>
      }

      <div class="flex gap-2 mb-4">
        <input
          type="text"
          [formControl]="queryControl"
          (keyup.enter)="search()"
          placeholder="First or last name"
          class="rounded-lg px-3 py-2 w-full"
          autocomplete="off"
        />
        <button
          type="button"
          (click)="search()"
          [disabled]="loading() || !queryControl.value?.trim()"
          class="saga-btn saga-btn-primary"
        >
          {{ loading() ? 'Searching…' : 'Search' }}
        </button>
      </div>

      @if (error()) {
        <div class="text-red-600 mb-4" data-testid="error">{{ error() }}</div>
      }

      @if (linkSentTo() !== null) {
        <div
          class="saga-card p-4 mb-6"
          data-testid="link-sent"
          style="border-color: var(--color-saga-primary); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1">Check your email</h2>
          <p class="text-sm" style="color: var(--color-saga-text)">
            We've sent a sign-in link to <span class="font-mono">{{ linkSentTo() }}</span>.
            Click the link in that email (it expires in 30 minutes) to access your registration.
          </p>
        </div>
      } @else if (results() !== null) {
        @if (results()!.length === 0) {
          <div class="mb-4" style="color: var(--color-saga-text-muted)" data-testid="no-results">
            No matches. Try a different name, or use one of the options below.
          </div>
        } @else {
          <p class="text-xs mb-2" style="color: var(--color-saga-text-muted)">
            For privacy, only the email already linked to the camper can edit the registration.
            Hit Register / Edit and we'll send a sign-in link to that email — you can update your
            email address (or any other detail) on the next screen once you click the link.
          </p>
          <ul
            class="saga-card divide-y mb-6"
            data-testid="results"
            style="border-color: var(--color-saga-border)"
          >
            @for (r of results(); track r.id) {
              <li class="p-3 flex items-center justify-between" style="border-color: var(--color-saga-border)">
                <div>
                  <div class="font-medium" style="color: var(--color-saga-text-strong)">
                    {{ r.firstName }} {{ r.lastName }}
                  </div>
                  <div class="text-sm" style="color: var(--color-saga-text-muted)">
                    {{ r.year }} · {{ r.parentEmailMasked }}
                  </div>
                </div>
                <button
                  type="button"
                  class="saga-btn saga-btn-primary !py-1 !px-3 !text-xs"
                  [disabled]="sendingLinkFor() === r.id"
                  (click)="select(r)"
                >
                  {{ sendingLinkFor() === r.id ? 'Sending…' : 'Register / Edit' }}
                </button>
              </li>
            }
          </ul>
        }
      }

      <!-- Always-visible fallback options. New campers and leader applicants don't
           need to search first — they can jump straight in. -->
      <div
        class="mt-2 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style="border-top: 1px solid var(--color-saga-border)"
      >
        <div class="text-sm" style="color: var(--color-saga-text-muted)">
          First time? No problem.
        </div>
        <div class="flex flex-col sm:flex-row gap-3 sm:w-auto">
          <button
            type="button"
            (click)="registerNew()"
            class="saga-btn saga-btn-secondary w-full sm:w-auto"
          >
            Register as a new camper
          </button>
          <a
            routerLink="/leader-apply"
            class="saga-btn saga-btn-secondary no-underline w-full sm:w-auto"
          >
            Apply as a leader
          </a>
        </div>
      </div>

      @if (hasDraft()) {
        <div class="mt-4 text-xs text-right">
          <button
            type="button"
            (click)="startOver()"
            class="saga-btn-ghost underline"
            style="color: var(--color-saga-text-muted); background: none; border: none; cursor: pointer; padding: 0;"
          >
            We saved your draft from earlier — clear and start over
          </button>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class LookupComponent implements OnInit {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  selectedCamper = output<LookupResult>();

  queryControl = new FormControl('');
  results = signal<LookupResult[] | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  sendingLinkFor = signal<number | null>(null);
  linkSentTo = signal<string | null>(null);
  stats = signal<StatsResponse | null>(null);
  // Starts true so the skeleton renders on first paint. Flipped false
  // on success or failure of /stats so we either show real data or
  // collapse the widget. Render free-tier cold starts can take ~30s,
  // so this skeleton is the difference between "is the page broken?"
  // and "ah, it's loading".
  statsLoading = signal(true);

  private readonly http = inject(HttpClient);
  private readonly ui = inject(UiService);

  ngOnInit(): void {
    this.http.get<StatsResponse>(`${environment.baseApi}/stats`).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.statsLoading.set(false);
      },
      error: () => {
        // Swallow — the page is still useful without the counter.
        this.statsLoading.set(false);
      },
    });
  }

  capPercent(): number {
    const s = this.stats();
    if (!s || s.cap <= 0) return 0;
    return Math.min(100, Math.round((s.total / s.cap) * 100));
  }

  // Native share where supported (iOS Safari, Android Chrome, recent
  // desktop Safari). Falls back to copying the URL to the clipboard +
  // a confirmation toast for everywhere else (Firefox, older browsers).
  async share(): Promise<void> {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const text = 'Power Camp 2026 registrations are open — Friday 31 July to Sunday 2 August.';

    const navAny = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> })
      : null;
    if (navAny?.share) {
      try {
        await navAny.share({ title: 'Power Camp 2026', text, url });
        return;
      } catch {
        // User cancelled — silent.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      this.ui.toast('Link copied — paste it into a chat.', 'success', 2200);
    } catch {
      this.ui.toast(`Copy this link: ${url}`, 'info', 4000);
    }
  }

  search() {
    const q = (this.queryControl.value ?? '').trim();
    if (!q) return;

    this.loading.set(true);
    this.error.set(null);
    this.results.set(null);

    this.http
      .post<{ results: LookupResult[] }>(`${environment.baseApi}/lookup`, { q })
      .subscribe({
        next: (res) => {
          this.results.set(res.results);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Search failed. Please try again.');
          this.loading.set(false);
        },
      });
  }

  select(r: LookupResult) {
    this.selectedCamper.emit(r);
    this.sendingLinkFor.set(r.id);
    this.error.set(null);

    this.http.post<{ ok: boolean }>(`${environment.baseApi}/request-link`, { camperId: r.id }).subscribe({
      next: () => {
        this.sendingLinkFor.set(null);
        this.linkSentTo.set(r.parentEmailMasked);
      },
      error: () => {
        this.sendingLinkFor.set(null);
        this.error.set("Couldn't send the sign-in link. Please try again.");
      },
    });
  }

  registerNew() {
    this.goToStep.emit(StepKey.Intro);
  }

  hasDraft(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('powercamp.form.draft');
    if (!raw) return false;
    try {
      const v = JSON.parse(raw);
      // Only show the "clear" link if at least one user-typed field is present.
      return !!(
        v?.firstName || v?.lastName || v?.parentEmail || v?.parentName || v?.email
      );
    } catch {
      return false;
    }
  }

  startOver(): void {
    localStorage.removeItem('powercamp.form.draft');
    window.location.reload();
  }
}
