import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StepKey } from '../../models';
import { environment } from '../../environments/environment';
import { UiService } from '../ui/ui.service';

interface StatsResponse {
  year: number;
  campers: number;
  leaders: number;
  total: number;
  cap: number;
  remaining: number;
}

@Component({
  selector: 'app-intro',
  imports: [],
  template: `
    <div
      class="customer-wrapper"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <img
        src="assets/DSC_0890.JPG"
        alt="Power Camp group photo"
        class="mb-6 rounded shadow max-h-64 w-auto object-cover"
      />
      <h1 class="text-3xl font-bold mb-2">Power Camp 2026</h1>
      <div class="mb-4 flex flex-wrap gap-1.5 text-xs uppercase tracking-wide font-semibold">
        <span class="olympic-pill" style="background-color: var(--color-saga-primary-soft); border-color: var(--color-saga-primary); color: var(--color-saga-primary);">Purity</span>
        <span class="olympic-pill" style="background-color: var(--color-saga-warning-soft); border-color: var(--color-saga-warning); color: var(--color-saga-warning);">Obedience</span>
        <span class="olympic-pill" style="background-color: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.55); color: var(--color-saga-text-strong);">Worship</span>
        <span class="olympic-pill" style="background-color: var(--color-saga-action-soft); border-color: var(--color-saga-action); color: var(--color-saga-action);">Endurance</span>
        <span class="olympic-pill" style="background-color: rgba(240, 164, 164, 0.18); border-color: var(--color-saga-danger); color: var(--color-saga-danger);">Righteousness</span>
      </div>
      <div class="w-full">
        <p class="mt-2 text-md text-gray-500">
          Power Camp 2026 runs <span class="font-semibold">Friday 31 July – Sunday 2 August 2026</span>.
          Three days of faith, fellowship, and slightly questionable camp food.
        </p>
        <p class="mt-2 text-md text-gray-500">
          This form is your ticket. Each camper — yes, even siblings —
          gets their own registration. We'll save your progress as you go,
          so if life happens you can come back and finish.
        </p>

        <div class="mt-5 text-sm text-gray-700 space-y-1">
          <div><span class="font-semibold">Starts:</span> Friday 31 July 2026 at 17:00</div>
          <div><span class="font-semibold">Ends:</span> Sunday 2 August 2026 at 14:00</div>
          <div><span class="font-semibold">Where:</span> YFC Magaliesburg (Boitumelo &amp; Kotula)</div>
          <div>
            <span class="font-semibold">Who:</span>
            <span class="ml-2" style="color: var(--color-saga-action); font-weight: 700;">ONLY grade 8 – grade 12</span>
          </div>
          <div>
            <span class="font-semibold">Cost:</span> R1300 (accommodation, meals, all activities, and the POWER camp T-shirt)
          </div>
          <div class="text-xs font-bold" style="color: var(--color-saga-danger)">Excludes transport to and from camp and tuck money.</div>
        </div>
      </div>
      <!-- Capacity widget — quietly nudges parents that camp fills up.
           Hidden until the API responds so we don't flash a placeholder
           (or worse, a 0/150 that looks like an error). -->
      @if (stats()) {
        <div class="mt-5 p-3 rounded-lg flex items-start gap-3"
          style="background-color: var(--color-saga-surface-2); border: 1px solid var(--color-saga-border);">
          <div class="flex-1">
            <div class="text-sm font-semibold" style="color: var(--color-saga-text-strong)">
              {{ stats()!.total }} of {{ stats()!.cap }} spots booked
            </div>
            <div class="text-xs mt-0.5" style="color: var(--color-saga-text-muted)">
              Space is limited — once we hit {{ stats()!.cap }} we'll close registration. Don't leave it for the last week.
            </div>
            <div class="mt-2 h-1.5 rounded-full overflow-hidden" style="background-color: var(--color-saga-border)">
              <div class="h-full rounded-full"
                [style.width.%]="capPercent()"
                [style.background-color]="capPercent() > 85 ? 'var(--color-saga-danger)' : 'var(--color-saga-action)'">
              </div>
            </div>
          </div>
        </div>
      }

      <div class="flex flex-col sm:flex-row w-full gap-3 mt-4">
        <button
          type="button"
          (click)="goToStep.emit(StepKey.LeaderApplication)"
          class="saga-btn saga-btn-primary"
        >
          Start Registration
        </button>
        <button
          type="button"
          (click)="share()"
          class="saga-btn saga-btn-secondary"
        >
          Share with a friend
        </button>
      </div>
    </div>
  `,
  styles: ``,
})
export class IntroComponent implements OnInit {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;

  stats = signal<StatsResponse | null>(null);
  private readonly http = inject(HttpClient);
  private readonly ui = inject(UiService);

  ngOnInit(): void {
    // Fire-and-forget — the counter is a nice-to-have, not blocking.
    // If the endpoint is slow or fails (cold start, etc.) the widget
    // simply doesn't render, which is fine.
    this.http.get<StatsResponse>(`${environment.baseApi}/stats`).subscribe({
      next: (s) => this.stats.set(s),
      error: () => {
        // Swallow — see comment above.
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

    const navAny = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }) : null;
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
}
