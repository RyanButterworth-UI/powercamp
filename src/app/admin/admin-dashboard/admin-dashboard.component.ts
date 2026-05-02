import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, AdminCamper } from '../admin.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin</h1>
        <button type="button" (click)="logout()" class="text-sm text-gray-600 underline">
          Sign out
        </button>
      </div>

      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <button
          type="button"
          (click)="downloadXlsx()"
          [disabled]="downloading()"
          class="bg-green-300 text-green-900 px-4 py-2 rounded disabled:bg-gray-200 disabled:text-gray-400"
          data-testid="download-xlsx"
        >
          {{ downloading() ? 'Building XLSX…' : 'Download XLSX' }}
        </button>
        <a
          [href]="sheetUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
          data-testid="open-sheet"
        >
          Open in Google Sheets ↗
        </a>
        <span class="text-sm text-gray-500">{{ total() }} campers in the database</span>
      </div>

      @if (loading()) {
        <div class="text-gray-500" data-testid="loading">Loading campers…</div>
      } @else if (error()) {
        <div class="text-red-700" data-testid="dashboard-error">{{ error() }}</div>
      } @else {
        @if (years().length > 0) {
          <div class="border-b border-gray-200 mb-3" data-testid="year-tabs">
            <nav class="flex gap-1">
              @for (y of years(); track y) {
                <button
                  type="button"
                  (click)="selectedYear.set(y)"
                  [class.border-green-500]="selectedYear() === y"
                  [class.text-green-700]="selectedYear() === y"
                  [class.font-semibold]="selectedYear() === y"
                  [class.border-transparent]="selectedYear() !== y"
                  [class.text-gray-500]="selectedYear() !== y"
                  class="px-4 py-2 text-sm border-b-2 hover:text-gray-700"
                  [attr.data-testid]="'year-tab-' + y"
                >
                  {{ y }}
                  <span class="ml-1 text-xs text-gray-400">({{ countByYear()[y] }})</span>
                </button>
              }
            </nav>
          </div>
        }

        <div class="overflow-x-auto border rounded">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left">
              <tr>
                <th class="px-3 py-2">Name</th>
                <th class="px-3 py-2">Parent email</th>
                <th class="px-3 py-2">Grade</th>
                <th class="px-3 py-2">Consent</th>
                <th class="px-3 py-2">Payment</th>
                <th class="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody class="divide-y" data-testid="campers-rows">
              @for (c of visibleCampers(); track c.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-3 py-2">{{ c.firstName }} {{ c.lastName }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ c.parentEmail }}</td>
                  <td class="px-3 py-2">{{ c.grade }}</td>
                  <td class="px-3 py-2">
                    @if (c.consentAcceptedAt) {
                      <span class="text-green-700">✓</span>
                    } @else {
                      <span class="text-gray-400">—</span>
                    }
                  </td>
                  <td class="px-3 py-2">
                    @if (c.paymentReceivedAt) {
                      <span class="text-green-700">✓</span>
                    } @else {
                      <span class="text-gray-400">—</span>
                    }
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-500">{{ c.source }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-3 py-6 text-center text-gray-400">
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

  // Years with campers, sorted desc — so 2026 sits first if present.
  years = computed(() => {
    const set = new Set(this.campers().map((c) => c.year));
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
    if (y === null) return this.campers();
    return this.campers().filter((c) => c.year === y);
  });

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  constructor() {
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
}
