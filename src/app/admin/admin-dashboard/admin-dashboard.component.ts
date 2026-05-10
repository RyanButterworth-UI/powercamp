import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, AdminCamper } from '../admin.service';
import { environment } from '../../../environments/environment';
import { UiService } from '../../ui/ui.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

export type ColumnGroupKey = 'camper' | 'contact' | 'emergency' | 'status' | 'meta';

export interface ColumnDef {
  key: string;
  label: string;
  group: ColumnGroupKey;
  default: boolean;
  tdClass?: string;
  render?: (c: AdminCamper) => string;
  sortValue?: (c: AdminCamper) => string | number | Date | null;
}

export interface ColumnGroup {
  key: ColumnGroupKey;
  label: string;
  columns: ColumnDef[];
}

export interface EmergencyContactGroup {
  key: string;
  name: string;
  contact: string;
  kids: AdminCamper[];
}

const COLUMNS_STORAGE_KEY = 'powercamp.admin.columns.v1';
const VIEW_MODE_STORAGE_KEY = 'powercamp.admin.viewMode.v1';

export type ViewMode = 'mix' | 'group';

function searchableHay(c: AdminCamper): string {
  const parts: string[] = [];
  for (const v of Object.values(c) as unknown[]) {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) parts.push(v.join(' '));
  }
  return parts.join(' ').toLowerCase();
}

function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  // Nulls sort last regardless of direction.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  let cmp: number;
  if (a instanceof Date && b instanceof Date) cmp = a.getTime() - b.getTime();
  else if (typeof a === 'number' && typeof b === 'number') cmp = a - b;
  else cmp = String(a).localeCompare(String(b), undefined, { numeric: true });
  return dir === 'asc' ? cmp : -cmp;
}

const GROUP_ORDER: { key: ColumnGroupKey; label: string }[] = [
  { key: 'camper', label: 'Camper' },
  { key: 'contact', label: 'Contact' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'status', label: 'Payment / Consent' },
  { key: 'meta', label: 'Meta' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', group: 'camper', default: true, sortValue: (c) => `${c.lastName} ${c.firstName}`.toLowerCase() },
  { key: 'grade', label: 'Grade', group: 'camper', default: true, render: (c) => c.grade ?? '' },
  { key: 'dob', label: 'DOB', group: 'camper', default: false, render: (c) => c.dob ?? '' },
  { key: 'gender', label: 'Gender', group: 'camper', default: false, render: (c) => c.gender ?? '' },
  { key: 'age', label: 'Age', group: 'camper', default: false, render: (c) => c.age ?? '' },

  { key: 'parentEmail', label: 'Parent email', group: 'contact', default: true, sortValue: (c) => c.parentEmail.toLowerCase() },
  { key: 'parentName', label: 'Parent name', group: 'contact', default: false, render: (c) => c.parentName ?? '' },
  { key: 'parentPhone', label: 'Parent phone', group: 'contact', default: false, render: (c) => c.parentPhone ?? '', tdClass: 'font-mono text-xs' },
  { key: 'email', label: 'Camper email', group: 'contact', default: false, render: (c) => c.email ?? '', tdClass: 'font-mono text-xs' },
  { key: 'camperCell', label: 'Camper cell', group: 'contact', default: false, render: (c) => c.camperCell ?? '', tdClass: 'font-mono text-xs' },

  { key: 'consentEmergencyName', label: 'Emergency name', group: 'emergency', default: false, render: (c) => c.consentEmergencyName ?? '' },
  { key: 'consentEmergencyContact', label: 'Emergency contact', group: 'emergency', default: false, render: (c) => c.consentEmergencyContact ?? '', tdClass: 'font-mono text-xs' },

  { key: 'consent', label: 'Consent', group: 'status', default: true, sortValue: (c) => c.consentAcceptedAt },
  { key: 'consentDate', label: 'Consent date', group: 'status', default: false, render: (c) => c.consentDate ?? '' },
  { key: 'payment', label: 'Payment', group: 'status', default: true, sortValue: (c) => c.paymentReceivedAt },

  { key: 'source', label: 'Source', group: 'meta', default: true, render: (c) => c.source ?? '', tdClass: 'text-xs text-muted' },
  { key: 'createdAt', label: 'Created', group: 'meta', default: false, render: (c) => fmtDate(c.createdAt), tdClass: 'text-xs text-muted' },
];

const COLUMN_GROUPS: ColumnGroup[] = GROUP_ORDER.map((g) => ({
  key: g.key,
  label: g.label,
  columns: ALL_COLUMNS.filter((c) => c.group === g.key),
}));

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
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
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/team" class="saga-tab no-underline">Team Admin</a>
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
          Open in Google Sheets
        </a>
        <span class="text-sm" style="color: var(--color-saga-text-muted)">
          {{ total() }} total · {{ visibleCampers().length }} shown
        </span>
      </div>


      @if (loading()) {
        <!-- Skeleton table — same row geometry as the real one (year tabs,
             search, view-mode, then 8 rows) so the page doesn't shift when
             data arrives. The header row + 8 placeholder rows cover the
             typical above-the-fold area on a laptop. -->
        <div data-testid="loading" class="flex flex-col gap-3">
          <div class="flex gap-2 mb-1">
            <app-skeleton width="3.5rem" height="20px" />
            <app-skeleton width="3.5rem" height="20px" />
          </div>
          <app-skeleton shape="block" height="40px" />
          <app-skeleton shape="block" height="80px" />
          <div class="flex flex-col gap-2 mt-2">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <app-skeleton shape="block" height="40px" />
            }
          </div>
        </div>
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

        <div class="saga-card p-4 mb-4" data-testid="columns-panel">
          <div class="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 class="text-sm font-semibold mb-0.5" style="color: var(--color-saga-text-strong)">
                Columns
              </h3>
              <p class="text-xs" style="color: var(--color-saga-text-muted)">
                Choose which fields appear in the table below.
              </p>
            </div>
            <div class="flex items-center gap-1.5" data-testid="view-mode">
              <button
                type="button"
                (click)="viewMode.set('group')"
                class="column-pill"
                [class.is-active]="viewMode() === 'group'"
                data-testid="view-mode-group"
                title="Show all columns from one section at a time"
              >Group</button>
              <button
                type="button"
                (click)="viewMode.set('mix')"
                class="column-pill"
                [class.is-active]="viewMode() === 'mix'"
                data-testid="view-mode-mix"
                title="Pick any combination of columns yourself"
              >Custom</button>
            </div>
          </div>

          @if (viewMode() === 'group') {
            <p class="text-xs mb-2" style="color: var(--color-saga-text-muted)">
              Pick a section — the table will swap to show every column in that section.
            </p>
            <div class="flex items-center gap-1.5 flex-wrap" data-testid="group-selector">
              @for (g of columnGroups(); track g.key) {
                <button
                  type="button"
                  (click)="selectedGroup.set(g.key)"
                  class="column-pill"
                  [class.is-active]="selectedGroup() === g.key"
                  [attr.data-testid]="'group-select-' + g.key"
                  [title]="groupColumnsList(g.key)"
                >{{ g.label }}</button>
              }
            </div>
            <p
              class="text-xs italic mt-2"
              style="color: var(--color-saga-text-muted)"
              data-testid="group-columns-summary"
            >
              Showing {{ activeGroupColumns().length }} {{ activeGroupColumns().length === 1 ? 'column' : 'columns' }}: {{ activeGroupColumnsLabel() }}
            </p>
          } @else {
            <p class="text-xs mb-2" style="color: var(--color-saga-text-muted)">
              Tap any column name to show or hide it. The table updates as you click.
            </p>
            <div class="flex flex-col gap-1.5" data-testid="columns-pills">
              @for (g of columnGroups(); track g.key) {
                <div
                  class="flex items-center gap-2 flex-wrap"
                  [attr.data-testid]="'col-group-' + g.key"
                >
                  <span
                    class="text-xs font-semibold uppercase tracking-wide"
                    style="color: var(--color-saga-text-muted); min-width: 5.5rem;"
                  >{{ g.label }}</span>
                  @for (col of g.columns; track col.key) {
                    <button
                      type="button"
                      (click)="toggleColumn(col.key)"
                      class="column-pill"
                      [class.is-active]="isColumnVisible(col.key)"
                      [attr.data-testid]="'col-pill-' + col.key"
                    >{{ col.label }}</button>
                  }
                </div>
              }
              <div class="flex items-center justify-between flex-wrap gap-2 mt-1">
                <span
                  class="text-xs italic"
                  style="color: var(--color-saga-text-muted)"
                  data-testid="custom-columns-summary"
                >
                  {{ visibleColumnKeys().length }} of {{ allColumns.length }} columns shown
                </span>
                <button
                  type="button"
                  (click)="resetColumns()"
                  class="text-xs underline cursor-pointer"
                  style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                  data-testid="columns-reset"
                >Reset to defaults</button>
              </div>
            </div>
          }
        </div>

        <input
          type="text"
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)"
          placeholder="Search any field…"
          class="rounded-lg w-full px-3 py-2 mb-3"
          data-testid="campers-search"
        />

        @if (isEmergencyView()) {
          <div class="overflow-x-auto" data-testid="campers-table-scroll">
            <table class="saga-table text-sm" style="min-width: max-content;">
              <thead>
                <tr>
                  <th>Emergency name</th>
                  <th>Emergency contact</th>
                  <th>Kids</th>
                </tr>
              </thead>
              <tbody data-testid="emergency-rows">
                @for (g of emergencyContactGroups(); track g.key) {
                  <tr [attr.data-testid]="'emergency-row-' + g.key" style="vertical-align: top;">
                    <td>{{ g.name || '—' }}</td>
                    <td class="font-mono text-xs">{{ g.contact || '—' }}</td>
                    <td>
                      <table class="kids-subtable" data-testid="campers-subtable">
                        <colgroup>
                          <col class="col-camper" />
                          <col class="col-grade" />
                          <col class="col-medical" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Camper</th>
                            <th>Grade</th>
                            <th>Medical</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (k of g.kids; track k.id) {
                            <tr>
                              <td>{{ k.firstName }} {{ k.lastName }}</td>
                              <td>{{ k.grade ?? '—' }}</td>
                              <td class="medical-cell">
                                @if (k.consentMedicalAidName) {
                                  <div>
                                    {{ k.consentMedicalAidName }}
                                    <span class="font-mono">· {{ k.consentMedicalAidNumber ?? '—' }}</span>
                                  </div>
                                } @else {
                                  <div class="no-medaid" style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
                                    No Medical Aid
                                  </div>
                                }
                                @if (k.medical) {
                                  <div class="text-xs">{{ k.medical }}</div>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="text-center py-6" style="color: var(--color-saga-text-muted)">
                      No emergency contacts in this year.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
        <div class="overflow-x-auto" data-testid="campers-table-scroll">
          <table class="saga-table text-sm" style="min-width: max-content;">
            <thead>
              <tr data-testid="campers-columns-header">
                @for (col of visibleColumns(); track col.key) {
                  <th
                    (click)="toggleSort(col.key)"
                    class="cursor-pointer select-none"
                    style="user-select: none;"
                  >
                    {{ col.label }}
                    @if (sortBy() === col.key) {
                      <span style="color: var(--color-saga-text-muted)">{{ sortDir() === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </th>
                }
              </tr>
            </thead>
            <tbody data-testid="campers-rows">
              @for (c of visibleCampers(); track c.id) {
                <tr>
                  @for (col of visibleColumns(); track col.key) {
                    <td [class]="col.tdClass ?? ''">
                      @switch (col.key) {
                        @case ('name') { {{ c.firstName }} {{ c.lastName }} }
                        @case ('parentEmail') {
                          <span class="inline-flex items-center gap-1.5 font-mono text-xs">
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
                            <button
                              type="button"
                              (click)="changeParentEmail(c)"
                              title="Change parent email (e.g. parent's email changed since last year)"
                              class="cursor-pointer p-1 rounded hover:bg-white/5"
                              style="background: none; border: none;"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-saga-text-muted)">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          </span>
                        }
                        @case ('consent') {
                          @if (c.consentAcceptedAt) {
                            <span
                              class="status-pill is-ok"
                              title="Consented"
                              [attr.data-testid]="'consent-badge-' + c.id"
                            >✓</span>
                          } @else {
                            <span
                              class="status-pill is-bad"
                              title="Outstanding"
                              [attr.data-testid]="'consent-badge-' + c.id"
                            >!</span>
                          }
                        }
                        @case ('payment') {
                          @if (c.paymentReceivedAt) {
                            <span
                              class="text-xs px-2 py-1 rounded saga-btn saga-btn-success inline-flex items-center justify-center"
                              style="min-width: 6rem;"
                              title="Payment received"
                              [attr.data-testid]="'payment-paid-' + c.id"
                            >Paid</span>
                          } @else {
                            <button
                              type="button"
                              (click)="markPaid(c)"
                              [disabled]="markingPaidFor() === c.id"
                              class="text-xs px-2 py-1 rounded saga-btn saga-btn-secondary inline-flex items-center justify-center"
                              style="min-width: 6rem;"
                              [attr.data-testid]="'payment-mark-' + c.id"
                            >
                              {{ markingPaidFor() === c.id ? 'Saving…' : 'Mark paid' }}
                            </button>
                          }
                        }
                        @default { {{ col.render ? col.render(c) : '' }} }
                      }
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="visibleColumns().length" class="text-center py-6" style="color: var(--color-saga-text-muted)">
                    No campers in this year.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        }
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
  readonly allColumns = ALL_COLUMNS;
  visibleColumnKeys = signal<string[]>(this.loadVisibleColumnKeys());

  viewMode = signal<ViewMode>(this.loadViewMode());
  // Always start on the Camper group when the page loads — the section
  // we previously persisted (Payment / Consent / etc.) was rarely the
  // one an admin actually wants to land on, and switching away takes one
  // click. Camper is the safest "what does this row mean" default.
  selectedGroup = signal<ColumnGroupKey>('camper');

  sortBy = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');

  columnGroups(): ColumnGroup[] {
    return COLUMN_GROUPS;
  }

  // Columns that the active group exposes — used to render the
  // "Showing 5 columns: name, grade, age, …" hint under the group picker
  // so the admin knows what they're about to see before the table reflows.
  activeGroupColumns(): ColumnDef[] {
    return COLUMN_GROUPS.find((g) => g.key === this.selectedGroup())?.columns ?? [];
  }

  activeGroupColumnsLabel(): string {
    return this.activeGroupColumns().map((c) => c.label).join(', ');
  }

  // Tooltip text for unselected group pills — same comma-separated list.
  groupColumnsList(key: ColumnGroupKey): string {
    const g = COLUMN_GROUPS.find((gg) => gg.key === key);
    return g ? g.columns.map((c) => c.label).join(', ') : '';
  }

  visibleColumns = computed<ColumnDef[]>(() => {
    if (this.viewMode() === 'group') {
      const g = COLUMN_GROUPS.find((gg) => gg.key === this.selectedGroup());
      return g ? g.columns : [];
    }
    const allowed = new Set(this.allColumns.map((c) => c.key));
    const order = new Map(this.allColumns.map((c, i) => [c.key, i]));
    return this.visibleColumnKeys()
      .filter((k) => allowed.has(k))
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .map((k) => this.allColumns.find((c) => c.key === k)!);
  });

  toggleSort(key: string): void {
    if (this.sortBy() !== key) {
      this.sortBy.set(key);
      this.sortDir.set('asc');
      return;
    }
    if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
      return;
    }
    this.sortBy.set(null);
    this.sortDir.set('asc');
  }

  isColumnVisible(key: string): boolean {
    return this.visibleColumnKeys().includes(key);
  }

  toggleColumn(key: string): void {
    const next = this.isColumnVisible(key)
      ? this.visibleColumnKeys().filter((k) => k !== key)
      : [...this.visibleColumnKeys(), key];
    this.visibleColumnKeys.set(next);
    this.persistVisibleColumnKeys(next);
  }

  resetColumns(): void {
    const next = this.defaultKeysForGroup(this.selectedGroup());
    this.visibleColumnKeys.set(next);
    this.persistVisibleColumnKeys(next);
  }

  private defaultKeysForGroup(g: ColumnGroupKey): string[] {
    const grp = COLUMN_GROUPS.find((gg) => gg.key === g);
    return (grp ?? COLUMN_GROUPS[0]).columns.map((c) => c.key);
  }

  private loadVisibleColumnKeys(): string[] {
    const fallback = this.defaultKeysForGroup('camper');
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string')) {
        return fallback;
      }
      const known = new Set(ALL_COLUMNS.map((c) => c.key));
      return parsed.filter((k) => known.has(k));
    } catch {
      return fallback;
    }
  }

  private persistVisibleColumnKeys(keys: string[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // Quota / private mode — ignore.
    }
  }

  private loadViewMode(): ViewMode {
    if (typeof localStorage === 'undefined') return 'mix';
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return v === 'group' ? 'group' : 'mix';
  }

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

  isEmergencyView(): boolean {
    return this.viewMode() === 'group' && this.selectedGroup() === 'emergency';
  }

  emergencyContactGroups = computed<EmergencyContactGroup[]>(() => {
    const map = new Map<string, EmergencyContactGroup>();
    for (const c of this.visibleCampers()) {
      const name = c.consentEmergencyName ?? '';
      const contact = c.consentEmergencyContact ?? '';
      const key = `${name.toLowerCase()}|${contact.toLowerCase()}`;
      let g = map.get(key);
      if (!g) {
        g = { key, name, contact, kids: [] };
        map.set(key, g);
      }
      g.kids.push(c);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  });

  visibleCampers = computed(() => {
    const y = this.selectedYear();
    const q = this.searchQuery().trim().toLowerCase();
    let rows = y === null ? this.campers() : this.campers().filter((c) => c.year === y);
    if (q) {
      rows = rows.filter((c) => searchableHay(c).includes(q));
    }
    const sBy = this.sortBy();
    if (sBy) {
      const col = ALL_COLUMNS.find((cc) => cc.key === sBy);
      if (col) {
        const valueOf = col.sortValue ?? ((c: AdminCamper) => (col.render ? col.render(c) : ''));
        const dir = this.sortDir();
        rows = [...rows].sort((a, b) => compareValues(valueOf(a), valueOf(b), dir));
      }
    }
    return rows;
  });

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  constructor() {
    effect(() => {
      const v = this.viewMode();
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, v); } catch { /* ignore */ }
      }
    });
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
    const ui = this.ui;
    const done = () => {
      this.copiedEmail.set(email);
      ui.toast(`📋 ${email} copied to clipboard`, 'success', 1800);
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

  async changeParentEmail(c: AdminCamper): Promise<void> {
    const next = await this.ui.prompt({
      text: `Change parent email for ${c.firstName} ${c.lastName}? Currently: ${c.parentEmail}`,
      defaultValue: c.parentEmail,
      placeholder: 'new.email@example.com',
      inputType: 'email',
      confirmLabel: 'Update email',
    });
    if (!next) return;
    const newEmail = next.trim().toLowerCase();
    if (!newEmail || newEmail === c.parentEmail.toLowerCase()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      this.ui.toast('That doesn\'t look like a valid email.', 'error');
      return;
    }
    this.admin.updateParentEmail(c.id, newEmail).subscribe({
      next: (res) => {
        this.campers.set(
          this.campers().map((row) => (row.id === c.id ? { ...row, parentEmail: res.parentEmail } : row))
        );
        this.ui.toast(`✓ Parent email updated to ${res.parentEmail}`, 'success');
      },
      error: (err) => {
        this.ui.toast(err?.status === 401 ? 'Session expired — sign in again.' : 'Failed to update email.', 'error');
      },
    });
  }

  async markPaid(c: AdminCamper): Promise<void> {
    const ok = await this.ui.confirm(
      `Mark ${c.firstName} ${c.lastName} as paid? This sends a confirmation email to ${c.parentEmail}.`,
      'Mark paid',
      'Cancel'
    );
    if (!ok) return;

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
        this.ui.toast(`✓ ${c.firstName} ${c.lastName} marked paid — confirmation emailed.`, 'success');
      },
      error: (err) => {
        this.markingPaidFor.set(null);
        if (err?.status === 401) {
          this.ui.toast('Session expired — sign in again.', 'error');
        } else {
          this.ui.toast('Failed to mark paid.', 'error');
        }
      },
    });
  }
}
