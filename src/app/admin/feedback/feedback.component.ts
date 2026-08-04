import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, FeedbackEntry, FeedbackSummary } from '../admin.service';
import { UiService } from '../../ui/ui.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

// The four scored questions, in the order the public form asks them. Driving
// both the summary cards and the table columns off one list keeps them from
// drifting apart.
const CATEGORIES = [
  { key: 'campOrganization', label: 'Organisation', hint: 'Did camp run well?' },
  { key: 'spiritualInput', label: 'Spiritual input', hint: 'Speaker and devotions' },
  { key: 'activities', label: 'Activities', hint: 'Games and free time' },
  { key: 'facilities', label: 'Meals / campsite', hint: "YFC's facilities" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

// Admin Feedback page — read-only. Post-camp responses for the current camp
// year: the four category averages up top, then every response in full, then
// the list of registered campers we haven't heard from yet.
@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Feedback</h1>
        <button type="button" (click)="logout()" class="text-sm text-gray-600 underline">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm flex-wrap" style="border-bottom: 1px solid var(--color-saga-border); -webkit-overflow-scrolling: touch;">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <a routerLink="/admin/bunks" class="saga-tab no-underline">Bunks</a>
        <a routerLink="/admin/waitlist" class="saga-tab no-underline">Waiting list</a>
        <span class="saga-tab is-active">Feedback</span>
      </nav>

      @if (loading()) {
        <div data-testid="loading" class="flex flex-col gap-3">
          <div class="flex gap-3 mb-1 flex-wrap">
            @for (i of [1, 2, 3, 4]; track i) {
              <app-skeleton shape="block" width="150px" height="76px" />
            }
          </div>
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <app-skeleton shape="block" height="44px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="text-red-700" data-testid="load-error">{{ loadError() }}</div>
      } @else if (total() === 0) {
        <p class="text-sm" data-testid="feedback-empty" style="color: var(--color-saga-text-muted)">
          No feedback yet for {{ year() }}. Responses appear here as campers fill in the form at
          <a href="/feedback" target="_blank" rel="noopener noreferrer" style="color: var(--color-saga-action)">/feedback</a>.
        </p>
      } @else {
        <!-- Category averages. -->
        <div class="flex gap-3 mb-4 flex-wrap" data-testid="feedback-summary">
          @for (c of categories; track c.key) {
            <div class="saga-card p-3 flex-1" style="min-width: 150px;">
              <div class="text-xs" style="color: var(--color-saga-text-muted)">{{ c.label }}</div>
              <div
                class="text-2xl font-bold"
                [style.color]="scoreColor(average(c.key))"
                [attr.data-testid]="'avg-' + c.key"
              >
                {{ average(c.key) === null ? '—' : average(c.key) }}
                <span class="text-sm font-normal" style="color: var(--color-saga-text-muted)">/ 5</span>
              </div>
              <div class="text-xs mt-1" style="color: var(--color-saga-text-muted)">{{ c.hint }}</div>
            </div>
          }
        </div>

        <div class="flex items-center gap-3 mb-3 flex-wrap">
          <input
            type="text"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            placeholder="Search name, one word, or comments…"
            class="rounded-lg px-3 py-2 text-sm"
            style="min-width: 18rem;"
            data-testid="feedback-search"
          />
          <button
            type="button"
            (click)="followUpOnly.set(!followUpOnly())"
            class="filter-pill"
            [class.is-active]="followUpOnly()"
            data-testid="filter-follow-up"
          >
            Wants a callback ({{ summary()!.followUpRequested }})
          </button>
          @if (query() || followUpOnly()) {
            <button
              type="button"
              (click)="clearFilters()"
              class="saga-btn-ghost text-sm underline cursor-pointer"
              data-testid="clear-filters"
            >
              Clear
            </button>
          }
        </div>

        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            (click)="downloadCsv()"
            class="saga-btn saga-btn-primary"
            data-testid="download-feedback-csv"
          >
            Download CSV
          </button>
          <span class="text-sm" style="color: var(--color-saga-text-muted)">
            {{ total() }} {{ total() === 1 ? 'response' : 'responses' }} for {{ year() }}
            @if (summary()!.registeredCampers > 0) {
              · {{ responseRate() }}% of {{ summary()!.registeredCampers }} registered campers
            }
            @if (summary()!.followUpRequested > 0) {
              · <strong style="color: var(--color-saga-warning)">{{ summary()!.followUpRequested }}</strong>
              asked for follow-up
            }
          </span>
        </div>

        @if (visible().length === 0) {
          <p class="text-sm" data-testid="no-matches" style="color: var(--color-saga-text-muted)">
            No responses match that. <button type="button" (click)="clearFilters()"
              class="underline cursor-pointer" style="color: var(--color-saga-action)">Clear the filters</button>.
          </p>
        } @else {
        <p class="text-sm mb-2" style="color: var(--color-saga-text-muted)">
          Showing {{ visible().length }} of {{ total() }}. Click a row for contact details.
        </p>
        <div class="overflow-x-auto">
          <table class="saga-table text-sm" data-testid="feedback-table">
            <thead>
              <tr>
                <th>Camper</th>
                @for (c of categories; track c.key) {
                  <th [title]="c.hint">{{ c.label }}</th>
                }
                <th>One word</th>
                <th>Highlight</th>
                <th>Anything else</th>
                <th>Callback</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              @for (f of visible(); track f.id) {
                <tr
                  [attr.data-testid]="'feedback-row-' + f.id"
                  (click)="toggleExpanded(f.id)"
                  style="cursor: pointer;"
                >
                  <td style="white-space:nowrap;">
                    {{ f.camperName }}
                    @if (f.camperId === null) {
                      <span
                        class="text-xs"
                        style="color: var(--color-saga-text-muted)"
                        title="This name didn't resolve to a single camper on the register — a leader, a joint entry, or a name two campers share. The response still counts."
                      >&nbsp;·&nbsp;unmatched</span>
                    }
                  </td>
                  @for (c of categories; track c.key) {
                    <td [style.color]="scoreColor(f[c.key])" class="font-semibold">{{ f[c.key] }}</td>
                  }
                  <td>{{ f.oneWord || '—' }}</td>
                  <td style="max-width: 22rem; white-space: pre-wrap;">{{ f.userComment || '—' }}</td>
                  <td style="max-width: 22rem; white-space: pre-wrap;">{{ f.additionalInfo || '—' }}</td>
                  <td>
                    @if (f.requiresFollowUp) {
                      <span style="color: var(--color-saga-warning)">Yes</span>
                    } @else {
                      —
                    }
                  </td>
                  <td style="white-space:nowrap;">{{ formatDate(f.createdAt) }}</td>
                </tr>
                @if (expandedId() === f.id) {
                  <tr [attr.data-testid]="'contact-row-' + f.id">
                    <td [attr.colspan]="categories.length + 6" style="background-color: var(--color-saga-surface-2);">
                      @if (f.camper; as c) {
                        <div class="p-2">
                          <div class="font-semibold mb-2" style="color: var(--color-saga-text-strong)">
                            {{ c.firstName }} {{ c.lastName }}
                            @if (c.grade) {
                              <span class="font-normal text-xs" style="color: var(--color-saga-text-muted)">
                                · Grade {{ c.grade }}
                              </span>
                            }
                          </div>
                          <dl class="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-x-4 gap-y-1.5">
                            <dt style="color: var(--color-saga-text-muted)">Parent / guardian</dt>
                            <dd>{{ c.parentName || '—' }}</dd>
                            <dt style="color: var(--color-saga-text-muted)">Parent email</dt>
                            <dd>
                              <a [href]="'mailto:' + c.parentEmail" style="color: var(--color-saga-action)"
                                >{{ c.parentEmail }}</a>
                            </dd>
                            <dt style="color: var(--color-saga-text-muted)">Parent phone</dt>
                            <dd>
                              @if (c.parentPhone) {
                                <a [href]="'tel:' + c.parentPhone" style="color: var(--color-saga-action)"
                                  >{{ c.parentPhone }}</a>
                              } @else { — }
                            </dd>
                            <dt style="color: var(--color-saga-text-muted)">Camper email</dt>
                            <dd>
                              @if (c.email) {
                                <a [href]="'mailto:' + c.email" style="color: var(--color-saga-action)"
                                  >{{ c.email }}</a>
                              } @else { — }
                            </dd>
                            <dt style="color: var(--color-saga-text-muted)">Camper cell</dt>
                            <dd>
                              @if (c.camperCell) {
                                <a [href]="'tel:' + c.camperCell" style="color: var(--color-saga-action)"
                                  >{{ c.camperCell }}</a>
                              } @else { — }
                            </dd>
                          </dl>
                        </div>
                      } @else {
                        <div class="p-2 text-sm" style="color: var(--color-saga-text-muted)">
                          No contact details — "{{ f.camperName }}" didn't match a single camper on
                          the {{ year() }} register, so there's no record to pull them from. Search
                          the Campers list by hand if you need to reach them.
                        </div>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        }

        <!-- Chase list. Approximate on purpose — see the note in the markup. -->
        @if (summary()!.awaiting.length > 0) {
          <div class="saga-card p-3 mt-6" data-testid="awaiting-panel">
            <button
              type="button"
              (click)="showAwaiting.set(!showAwaiting())"
              class="text-sm font-semibold underline cursor-pointer"
              data-testid="toggle-awaiting"
            >
              {{ showAwaiting() ? 'Hide' : 'Show' }} the {{ summary()!.awaiting.length }} campers
              we haven't heard from
            </button>
            @if (showAwaiting()) {
              <p class="text-xs mt-2 mb-2" style="color: var(--color-saga-text-muted)">
                Campers with no response matched to their record. Approximate: a joint entry
                ("Abigail and Joshua") or a misspelt name stays unmatched, so someone can appear
                here despite having filled the form. Use it as a chase list, not a ledger.
              </p>
              <ul class="text-sm columns-2 sm:columns-3">
                @for (c of summary()!.awaiting; track c.id) {
                  <li>{{ c.name }}</li>
                }
              </ul>
            }
          </div>
        }
      }
    </div>
  `,
  styles: ``,
})
export class AdminFeedbackComponent {
  readonly categories = CATEGORIES;

  entries = signal<FeedbackEntry[]>([]);
  summary = signal<FeedbackSummary | null>(null);
  total = signal(0);
  year = signal<number | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  showAwaiting = signal(false);

  query = signal('');
  followUpOnly = signal(false);
  // Which row has its contact panel open. One at a time — this is a scan-and-
  // call workflow, not a comparison one.
  expandedId = signal<number | null>(null);

  followUps = computed(() => this.entries().filter((f) => f.requiresFollowUp));

  // Search covers what an admin would actually scan for: who said it, their
  // one word, and the free text. Ratings are filtered by eye off the columns.
  visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.entries().filter((f) => {
      if (this.followUpOnly() && !f.requiresFollowUp) return false;
      if (!q) return true;
      return [
        f.camperName,
        f.oneWord,
        f.userComment,
        f.additionalInfo,
        f.camper ? `${f.camper.firstName} ${f.camper.lastName}` : '',
        f.camper?.parentName ?? '',
        f.camper?.parentEmail ?? '',
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  });

  toggleExpanded(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  clearFilters(): void {
    this.query.set('');
    this.followUpOnly.set(false);
  }

  responseRate = computed(() => {
    const registered = this.summary()?.registeredCampers ?? 0;
    if (registered === 0) return 0;
    return Math.round((this.total() / registered) * 100);
  });

  private readonly admin = inject(AdminService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  constructor() {
    this.admin.listFeedback().subscribe({
      next: (res) => {
        this.entries.set(res.feedback);
        this.summary.set(res.summary);
        this.total.set(res.total);
        this.year.set(res.year);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.redirectToLogin();
        } else {
          this.loadError.set('Failed to load feedback.');
        }
      },
    });
  }

  average(key: CategoryKey): number | null {
    return this.summary()?.[key] ?? null;
  }

  // Traffic light matching the form's own guidance to campers: 0 needs work,
  // 2 middle of the road, 5 couldn't be better.
  scoreColor(score: number | null): string {
    if (score === null) return 'var(--color-saga-text-muted)';
    if (score >= 4) return 'var(--color-saga-success)';
    if (score >= 2.5) return 'var(--color-saga-warning)';
    return 'var(--color-saga-danger)';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  }

  // Client-side export — the rows are already loaded, so this needs no
  // endpoint. Mirrors the "Download XLSX" affordance on the campers page.
  downloadCsv(): void {
    const header = [
      'Camper',
      ...CATEGORIES.map((c) => c.label),
      'One word',
      'Highlight',
      'Anything else',
      'Follow-up',
      'Received',
    ];
    const rows = this.entries().map((f) => [
      f.camperName,
      ...CATEGORIES.map((c) => String(f[c.key])),
      f.oneWord ?? '',
      f.userComment ?? '',
      f.additionalInfo ?? '',
      f.requiresFollowUp ? 'Yes' : 'No',
      f.createdAt,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => this.csvCell(cell)).join(','))
      .join('\r\n');

    // BOM so Excel opens the accented names correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `powercamp-feedback-${this.year() ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.ui.toast(`Downloaded ${this.total()} responses.`, 'info');
  }

  private csvCell(value: string): string {
    // Always quote: the free-text answers routinely contain commas and
    // newlines, and doubling any embedded quote is the CSV escape.
    return `"${value.replace(/"/g, '""')}"`;
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
