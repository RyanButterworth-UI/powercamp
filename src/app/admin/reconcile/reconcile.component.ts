import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, ReconcileResult } from '../admin.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

// Admin "Sync" page — a READ-ONLY reconciliation report between the
// Registrations sheet and the campers table. It writes nothing; it surfaces
// drift (usually caused by someone editing the sheet by hand) in three buckets
// so an admin can act on it deliberately. See backend lib/reconcile.ts.
@Component({
  selector: 'app-admin-reconcile',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="container mx-auto p-6 max-w-6xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Sheet / DB sync</h1>
        <button type="button" (click)="logout()" class="text-sm text-gray-600 underline">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm flex-wrap" style="border-bottom: 1px solid var(--color-saga-border);">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <a routerLink="/admin/bunks" class="saga-tab no-underline">Bunks</a>
        <a routerLink="/admin/waitlist" class="saga-tab no-underline">Waiting list</a>
        <a routerLink="/admin/feedback" class="saga-tab no-underline">Feedback</a>
        <span class="saga-tab is-active">Sync</span>
      </nav>

      <div class="saga-card p-3 mb-6 flex items-start justify-between gap-3 flex-wrap">
        <p class="text-sm" style="color: var(--color-saga-text-muted); max-width: 46rem;">
          A read-only comparison of the <strong>Registrations</strong> sheet against the database for
          the current camp year. Nothing here changes the sheet or the database — it just shows where
          they've drifted apart (usually from a row added or edited directly on the sheet). Resolve
          anything below by hand, then refresh.
        </p>
        <button
          type="button"
          (click)="load()"
          [disabled]="loading()"
          class="saga-btn saga-btn-secondary"
          data-testid="reconcile-refresh"
        >
          {{ loading() ? 'Checking…' : 'Refresh' }}
        </button>
      </div>

      @if (loading()) {
        <div data-testid="loading" class="flex flex-col gap-3">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton shape="block" height="52px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="text-red-700" data-testid="load-error">{{ loadError() }}</div>
      } @else if (result()) {
        @if (result(); as r) {
        <!-- Summary tiles -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" data-testid="reconcile-counts">
          <div class="saga-card p-3 text-center">
            <div class="text-2xl font-bold">{{ r.counts.sheetRows }}</div>
            <div class="text-xs" style="color: var(--color-saga-text-muted)">Sheet rows</div>
          </div>
          <div class="saga-card p-3 text-center">
            <div class="text-2xl font-bold">{{ r.counts.dbCampers }}</div>
            <div class="text-xs" style="color: var(--color-saga-text-muted)">DB campers</div>
          </div>
          <div class="saga-card p-3 text-center">
            <div class="text-2xl font-bold" style="color: var(--color-saga-success)">{{ r.counts.matched }}</div>
            <div class="text-xs" style="color: var(--color-saga-text-muted)">In sync</div>
          </div>
          <div class="saga-card p-3 text-center">
            <div class="text-2xl font-bold" [style.color]="r.counts.sheetOnly ? 'var(--color-saga-danger)' : 'inherit'">{{ r.counts.sheetOnly }}</div>
            <div class="text-xs" style="color: var(--color-saga-text-muted)">Sheet only</div>
          </div>
          <div class="saga-card p-3 text-center">
            <div class="text-2xl font-bold" [style.color]="r.counts.dbOnly ? 'var(--color-saga-danger)' : 'inherit'">{{ r.counts.dbOnly }}</div>
            <div class="text-xs" style="color: var(--color-saga-text-muted)">DB only</div>
          </div>
          <div class="saga-card p-3 text-center">
            <div class="text-2xl font-bold" [style.color]="r.counts.conflicts ? 'var(--color-saga-warning, #b45309)' : 'inherit'">{{ r.counts.conflicts }}</div>
            <div class="text-xs" style="color: var(--color-saga-text-muted)">Conflicts</div>
          </div>
        </div>

        @if (inSync()) {
          <div
            class="saga-card p-4"
            data-testid="reconcile-in-sync"
            style="border-color: var(--color-saga-success); background-color: var(--color-saga-primary-soft)"
          >
            <h2 class="font-semibold mb-1" style="color: var(--color-saga-success)">Everything's in sync</h2>
            <p class="text-sm" style="color: var(--color-saga-text)">
              Every current-year camper matches between the sheet and the database. Nothing to do.
            </p>
          </div>
        }

        <!-- Conflicts: matched on both sides but details disagree. -->
        @if (r.conflicts.length) {
          <section class="mb-8" data-testid="reconcile-conflicts">
            <h2 class="text-lg font-semibold mb-1">Conflicts ({{ r.conflicts.length }})</h2>
            <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
              On both the sheet and the database, but some details disagree. Decide which is right and
              fix the wrong side by hand.
            </p>
            <div class="flex flex-col gap-3">
              @for (c of r.conflicts; track c.rowNumber) {
                <div class="saga-card p-3" [attr.data-testid]="'conflict-row-' + c.rowNumber">
                  <div class="flex items-baseline justify-between gap-2 flex-wrap mb-2">
                    <span class="font-semibold">{{ c.firstName }} {{ c.lastName }}</span>
                    <span class="text-xs" style="color: var(--color-saga-text-muted)">
                      {{ c.parentEmail }} · sheet row {{ c.rowNumber }}@if (c.camperId) { · DB id {{ c.camperId }} }
                    </span>
                  </div>
                  <table class="saga-table text-sm w-full">
                    <thead>
                      <tr><th>Field</th><th>Sheet</th><th>Database</th></tr>
                    </thead>
                    <tbody>
                      @for (d of c.diffs; track d.field) {
                        <tr>
                          <td class="font-medium">{{ d.field }}</td>
                          <td>{{ d.sheet || '—' }}</td>
                          <td>{{ d.db || '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        }

        <!-- On the sheet, not in the DB — likely hand-added rows. -->
        @if (r.sheetOnly.length) {
          <section class="mb-8" data-testid="reconcile-sheet-only">
            <h2 class="text-lg font-semibold mb-1">On the sheet, not in the database ({{ r.sheetOnly.length }})</h2>
            <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
              These rows exist on the Registrations sheet but have no matching camper in the database —
              usually someone added them to the sheet by hand. They're invisible to the dashboard,
              consent tracking and exports until they're entered as real registrations.
            </p>
            <div class="overflow-x-auto">
              <table class="saga-table text-sm">
                <thead>
                  <tr><th>Sheet row</th><th>Camper</th><th>Parent email</th><th>Grade</th><th>Sheet id</th></tr>
                </thead>
                <tbody>
                  @for (s of r.sheetOnly; track s.rowNumber) {
                    <tr [attr.data-testid]="'sheet-only-' + s.rowNumber">
                      <td>{{ s.rowNumber }}</td>
                      <td>{{ s.firstName }} {{ s.lastName }}</td>
                      <td>{{ s.parentEmail || '—' }}</td>
                      <td>{{ s.grade || '—' }}</td>
                      <td>{{ s.camperId ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        <!-- In the DB, not on the sheet. -->
        @if (r.dbOnly.length) {
          <section class="mb-8" data-testid="reconcile-db-only">
            <h2 class="text-lg font-semibold mb-1">In the database, not on the sheet ({{ r.dbOnly.length }})</h2>
            <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
              These campers are in the database but missing from the Registrations sheet — so the sheet
              (and anything downstream of it) is out of date for them.
            </p>
            <div class="overflow-x-auto">
              <table class="saga-table text-sm">
                <thead>
                  <tr><th>DB id</th><th>Camper</th><th>Parent email</th><th>Grade</th></tr>
                </thead>
                <tbody>
                  @for (d of r.dbOnly; track d.id) {
                    <tr [attr.data-testid]="'db-only-' + d.id">
                      <td>{{ d.id }}</td>
                      <td>{{ d.firstName }} {{ d.lastName }}</td>
                      <td>{{ d.parentEmail || '—' }}</td>
                      <td>{{ d.grade || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
        }
      }
    </div>
  `,
  styles: ``,
})
export class AdminReconcileComponent {
  result = signal<ReconcileResult | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);

  inSync = computed(() => {
    const r = this.result();
    return !!r && r.counts.sheetOnly === 0 && r.counts.dbOnly === 0 && r.counts.conflicts === 0;
  });

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.admin.getReconcile().subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.redirectToLogin();
        } else {
          this.loadError.set('Failed to compare the sheet with the database.');
        }
      },
    });
  }

  logout(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }

  private redirectToLogin(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }
}
