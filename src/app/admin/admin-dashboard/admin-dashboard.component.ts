import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, AdminCamper } from '../admin.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Campers</h1>
        <button type="button" (click)="logout()" class="saga-btn-ghost text-sm underline cursor-pointer">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm" style="border-bottom: 1px solid var(--color-saga-border)">
        <span class="saga-tab is-active">Campers</span>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
      </nav>

      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <button
          type="button"
          (click)="downloadXlsx()"
          [disabled]="downloading()"
          class="saga-btn saga-btn-primary"
          data-testid="download-xlsx"
        >
          {{ downloading() ? 'Building XLSX…' : 'Download XLSX' }}
        </button>
        <a
          [href]="sheetUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="saga-btn saga-btn-secondary no-underline"
          data-testid="open-sheet"
        >
          Open in Google Sheets ↗
        </a>
        <span class="text-sm" style="color: var(--color-saga-text-muted)">
          {{ total() }} total · {{ visibleCampers().length }} shown
        </span>
      </div>

      <input
        type="text"
        [value]="searchQuery()"
        (input)="searchQuery.set($any($event.target).value)"
        placeholder="Search by name or parent email…"
        class="rounded-lg w-full px-3 py-2 mb-4"
        data-testid="campers-search"
      />

      @if (loading()) {
        <div data-testid="loading" style="color: var(--color-saga-text-muted)">Loading campers…</div>
      } @else if (error()) {
        <div data-testid="dashboard-error" style="color: var(--color-saga-danger)">{{ error() }}</div>
      } @else {
        @if (years().length > 0) {
          <div class="mb-3" data-testid="year-tabs" style="border-bottom: 1px solid var(--color-saga-border)">
            <nav class="flex gap-1">
              @for (y of years(); track y) {
                <button
                  type="button"
                  (click)="selectedYear.set(y)"
                  class="saga-tab"
                  [class.is-active]="selectedYear() === y"
                  [attr.data-testid]="'year-tab-' + y"
                >
                  {{ y }}
                  <span class="ml-1 text-xs" style="color: var(--color-saga-text-muted)">
                    ({{ countByYear()[y] }})
                  </span>
                </button>
              }
            </nav>
          </div>
        }

        <div class="overflow-x-auto">
          <table class="saga-table text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent email</th>
                <th>Grade</th>
                <th>Consent</th>
                <th>Payment</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody data-testid="campers-rows">
              @for (c of visibleCampers(); track c.id) {
                <tr>
                  <td>{{ c.firstName }} {{ c.lastName }}</td>
                  <td class="font-mono text-xs">
                    <span class="inline-flex items-center gap-1.5">
                      <span>{{ c.parentEmail }}</span>
                      <button
                        type="button"
                        (click)="copyEmail(c.parentEmail)"
                        [title]="copiedEmail() === c.parentEmail ? 'Copied!' : 'Copy email'"
                        class="cursor-pointer p-1 rounded hover:bg-white/5"
                        style="background: none; border: none;"
                      >
                        @if (copiedEmail() === c.parentEmail) {
                          <span style="color: var(--color-saga-success); font-size: 11px;">✓</span>
                        } @else {
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-saga-text-muted)">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        }
                      </button>
                    </span>
                  </td>
                  <td>{{ c.grade }}</td>
                  <td>
                    @if (c.consentAcceptedAt) {
                      <span style="color: var(--color-saga-success)">✓</span>
                    } @else {
                      <span style="color: var(--color-saga-text-muted)">—</span>
                    }
                  </td>
                  <td>
                    @if (c.paymentReceivedAt) {
                      <span style="color: var(--color-saga-success)">✓ paid</span>
                    } @else {
                      <button
                        type="button"
                        (click)="markPaid(c)"
                        [disabled]="markingPaidFor() === c.id"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-secondary"
                      >
                        {{ markingPaidFor() === c.id ? 'Saving…' : 'Mark paid' }}
                      </button>
                    }
                  </td>
                  <td class="text-xs" style="color: var(--color-saga-text-muted)">{{ c.source }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center py-6" style="color: var(--color-saga-text-muted)">
                    No campers in this year.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class AdminDashboardComponent {
  campers = signal<AdminCamper[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  downloading = signal(false);
  selectedYear = signal<number | null>(null);
  sheetUrl = environment.sheetUrl;
  markingPaidFor = signal<number | null>(null);
  searchQuery = signal('');
  campYear = signal<number | null>(null);
  copiedEmail = signal<string | null>(null);

  // Years with campers, plus CAMP_YEAR even if it has no rows yet, sorted
  // desc — so the active 2026 tab is always present even before submissions.
  years = computed(() => {
    const set = new Set(this.campers().map((c) => c.year));
    const cy = this.campYear();
    if (cy !== null) set.add(cy);
    return Array.from(set).sort((a, b) => b - a);
  });

  countByYear = computed(() => {
    const out: Record<number, number> = {};
    for (const c of this.campers()) {
      out[c.year] = (out[c.year] ?? 0) + 1;
    }
    return out;
  });

  visibleCampers = computed(() => {
    const y = this.selectedYear();
    const q = this.searchQuery().trim().toLowerCase();
    let rows = y === null ? this.campers() : this.campers().filter((c) => c.year === y);
    if (q) {
      rows = rows.filter((c) => {
        const hay = `${c.firstName} ${c.lastName} ${c.parentEmail} ${c.email ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return rows;
  });

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  constructor() {
    // Pull CAMP_YEAR first so it's part of the year tabs even when no rows
    // exist yet for that year. Failure is non-fatal — fall back to the
    // years derived from rows.
    this.admin.me().subscribe({
      next: (res) => this.campYear.set(res.campYear),
      error: () => {},
    });

    this.admin.list().subscribe({
      next: (res) => {
        this.campers.set(res.campers);
        this.total.set(res.total);
        // Default to the most recent year (so 2026 is selected first when present).
        const ys = this.years();
        if (ys.length > 0) this.selectedYear.set(ys[0]);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.admin.clearToken();
          this.router.navigate(['/admin/login']);
        } else {
          this.error.set('Failed to load campers.');
        }
      },
    });
  }

  downloadXlsx(): void {
    this.downloading.set(true);
    this.admin.downloadExport().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `powercamp-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
        this.error.set('Failed to build the export.');
      },
    });
  }

  logout(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }

  copyEmail(email: string): void {
    if (!email) return;
    // navigator.clipboard is async + only available in secure contexts
    // (https or localhost). Fall back to a hidden textarea otherwise.
    const done = () => {
      this.copiedEmail.set(email);
      setTimeout(() => this.copiedEmail.set(null), 1600);
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(done, () => fallback());
    } else {
      fallback();
    }
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch {}
      document.body.removeChild(ta);
    }
  }

  markPaid(c: AdminCamper): void {
    if (!confirm(`Mark ${c.firstName} ${c.lastName} as paid? This sends a confirmation email to ${c.parentEmail}.`)) {
      return;
    }
    this.markingPaidFor.set(c.id);
    this.admin.markPaid(c.id).subscribe({
      next: (res) => {
        this.markingPaidFor.set(null);
        // Optimistically patch the row in our local list so the UI updates
        // without a full refetch.
        const updated = this.campers().map((row) =>
          row.id === c.id ? { ...row, paymentReceivedAt: res.paymentReceivedAt } : row
        );
        this.campers.set(updated);
      },
      error: (err) => {
        this.markingPaidFor.set(null);
        alert(err?.status === 401 ? 'Session expired — sign in again.' : 'Failed to mark paid.');
      },
    });
  }
}
