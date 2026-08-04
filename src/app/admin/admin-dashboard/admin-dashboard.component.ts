import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, AdminCamper, CamperEditPayload } from '../admin.service';
import { askToDelete, deleteErrorMessage } from '../confirm-delete';
import { searchableHay } from '../search';
import { environment } from '../../../environments/environment';
import { UiService } from '../../ui/ui.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';
import { CamperEditComponent } from '../camper-edit/camper-edit.component';

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
  imports: [CommonModule, RouterLink, SkeletonComponent, CamperEditComponent],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Campers</h1>
        <button type="button" (click)="logout()" class="saga-btn-ghost text-sm underline cursor-pointer">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm flex-wrap" style="border-bottom: 1px solid var(--color-saga-border); -webkit-overflow-scrolling: touch;">
        <span class="saga-tab is-active">Campers</span>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <a routerLink="/admin/bunks" class="saga-tab no-underline">Bunks</a>
        <a routerLink="/admin/waitlist" class="saga-tab no-underline">Waiting list</a>
        <a routerLink="/admin/feedback" class="saga-tab no-underline">Feedback</a>
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
              <button
                type="button"
                (click)="showAllColumns()"
                class="column-pill"
                [class.is-active]="allColumnsShown()"
                data-testid="view-mode-all"
                title="Show every available column at once"
              >All fields</button>
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
                <th style="width:0;"></th>
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
                  <td style="white-space:nowrap;">
                    <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        (click)="openEditor(c)"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-secondary inline-flex items-center gap-1 cursor-pointer"
                        [title]="'Edit ' + c.firstName + ' ' + c.lastName"
                        [attr.data-testid]="'edit-' + c.id"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteCamper(c)"
                        [disabled]="deletingFor() === c.id"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-danger inline-flex items-center gap-1 cursor-pointer"
                        [title]="'Delete ' + c.firstName + ' ' + c.lastName"
                        [attr.data-testid]="'delete-' + c.id"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                        {{ deletingFor() === c.id ? 'Deleting…' : 'Delete' }}
                      </button>
                      <button
                        type="button"
                        (click)="demote(c)"
                        [disabled]="demotingFor() === c.id"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-secondary inline-flex items-center gap-1 cursor-pointer"
                        [title]="'Move ' + c.firstName + ' ' + c.lastName + ' back to the waiting list'"
                        [attr.data-testid]="'demote-' + c.id"
                      >
                        {{ demotingFor() === c.id ? 'Moving…' : 'To waitlist' }}
                      </button>
                    </span>
                  </td>
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
                              title="Consent completed"
                              [attr.data-testid]="'consent-badge-' + c.id"
                            >Completed</span>
                          } @else {
                            <span class="inline-flex items-center gap-1.5">
                              <span
                                class="status-pill is-bad"
                                title="Consent not completed"
                                [attr.data-testid]="'consent-badge-' + c.id"
                              >Not completed</span>
                              <button
                                type="button"
                                (click)="requestConsent(c)"
                                [disabled]="requestingConsentFor() === c.id"
                                class="text-xs px-2 py-1 rounded saga-btn saga-btn-secondary inline-flex items-center justify-center cursor-pointer"
                                title="Email the parent a link to complete consent"
                                [attr.data-testid]="'request-consent-' + c.id"
                              >
                                {{ requestingConsentFor() === c.id ? 'Sending…' : 'Request consent' }}
                              </button>
                            </span>
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
                  <td [attr.colspan]="visibleColumns().length + 1" class="text-center py-6" style="color: var(--color-saga-text-muted)">
                    No campers in this year.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        }
      }

      <app-camper-edit
        [camper]="editingCamper()"
        [saving]="savingEdit()"
        (submitForm)="saveEdit($event)"
        (cancel)="closeEditor()"
      />
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
  requestingConsentFor = signal<number | null>(null);
  deletingFor = signal<number | null>(null);
  demotingFor = signal<number | null>(null);
  searchQuery = signal('');
  campYear = signal<number | null>(null);
  // Inline edit: the camper whose row is open in the drawer (null = closed),
  // and whether a save is in flight.
  editingCamper = signal<AdminCamper | null>(null);
  savingEdit = signal(false);
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
      if (!g) return [];
      // Always pin Name as the leftmost column when in group mode —
      // otherwise switching to Payment/Consent (or Emergency) hides the
      // identity of every row and the admin has no way to tell which
      // camper they're about to Mark paid for. The Camper group already
      // contains Name so we don't double-add.
      const nameCol = this.allColumns.find((c) => c.key === 'name');
      if (!nameCol || g.key === 'camper' || g.columns.some((c) => c.key === 'name')) {
        return g.columns;
      }
      return [nameCol, ...g.columns];
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

  /** "All fields" — switch to custom view with every available column on. */
  showAllColumns(): void {
    const next = ALL_COLUMNS.map((c) => c.key);
    this.viewMode.set('mix');
    this.visibleColumnKeys.set(next);
    this.persistVisibleColumnKeys(next);
  }

  /** True when custom mode is active and every column is currently shown. */
  allColumnsShown(): boolean {
    return this.viewMode() === 'mix' && this.visibleColumnKeys().length === ALL_COLUMNS.length;
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
    } else {
      // Default ordering when no column is explicitly chosen: grade, then
      // name, then age. Numeric-aware so 8 < 9 < 10 < 12; non-numeric grades
      // (e.g. "Leader") sort to the end.
      const num = (v: string | null | undefined): number => {
        const n = parseInt(String(v ?? ''), 10);
        return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
      };
      rows = [...rows].sort(
        (a, b) =>
          num(a.grade) - num(b.grade) ||
          String(a.grade ?? '').localeCompare(String(b.grade ?? ''), undefined, { sensitivity: 'base' }) ||
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, undefined, { sensitivity: 'base' }) ||
          num(a.age) - num(b.age)
      );
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

  async requestConsent(c: AdminCamper): Promise<void> {
    const ok = await this.ui.confirm(
      `Email ${c.parentEmail} a link for ${c.firstName} ${c.lastName} to complete their consent? The link is valid for 12 hours.`,
      'Send consent request',
      'Cancel'
    );
    if (!ok) return;

    this.requestingConsentFor.set(c.id);
    this.admin.requestConsent(c.id).subscribe({
      next: (res) => {
        this.requestingConsentFor.set(null);
        this.ui.toast(`✓ Consent link sent to ${res.sentTo}.`, 'success');
      },
      error: (err) => {
        this.requestingConsentFor.set(null);
        this.ui.toast(
          err?.status === 401
            ? 'Session expired — sign in again.'
            : 'Failed to send the consent request.',
          'error'
        );
      },
    });
  }

  async deleteCamper(c: AdminCamper): Promise<void> {
    const pw = await askToDelete(this.ui, `${c.firstName} ${c.lastName}`);
    if (!pw) return;

    this.deletingFor.set(c.id);
    this.admin.deleteCamper(c.id, pw).subscribe({
      next: () => {
        this.deletingFor.set(null);
        // Drop the row locally rather than refetching, matching markPaid.
        this.campers.set(this.campers().filter((row) => row.id !== c.id));
        this.total.update((n) => Math.max(0, n - 1));
        this.ui.toast(`${c.firstName} ${c.lastName} deleted.`, 'info');
      },
      error: (err) => {
        this.deletingFor.set(null);
        this.ui.toast(deleteErrorMessage(err), 'error');
      },
    });
  }

  async demote(c: AdminCamper): Promise<void> {
    const ok = await this.ui.confirm(
      `Move ${c.firstName} ${c.lastName} back to the waiting list? Their full details and consent are kept, so they can be moved back to the main list later. They'll be removed from the main list here — tidy their row on the Google Sheet by hand.`,
      'Move to waiting list',
      'Cancel'
    );
    if (!ok) return;

    this.demotingFor.set(c.id);
    this.admin.demoteCamper(c.id).subscribe({
      next: () => {
        this.demotingFor.set(null);
        // Drop the row locally rather than refetching, matching deleteCamper.
        this.campers.set(this.campers().filter((row) => row.id !== c.id));
        this.total.update((n) => Math.max(0, n - 1));
        this.ui.toast(`${c.firstName} ${c.lastName} moved back to the waiting list.`, 'success');
      },
      error: (err) => {
        this.demotingFor.set(null);
        this.ui.toast(
          err?.status === 401
            ? 'Session expired — sign in again.'
            : 'Failed to move to the waiting list.',
          'error'
        );
      },
    });
  }

  // ----- Inline edit -----

  // Row "Edit" click. Gated by the per-session editor unlock: if editing isn't
  // unlocked yet, prompt for the edit password once and exchange it for an
  // editor token; only then open the drawer. If already unlocked, open straight
  // away. The raw password is never stored — only the returned token is.
  async openEditor(c: AdminCamper): Promise<void> {
    if (!this.admin.isEditorUnlocked()) {
      const pw = await this.ui.prompt({
        text: 'Enter the edit password to unlock editing for this session. Only Ryan & Shayln have this.',
        placeholder: 'Edit password',
        inputType: 'password',
        confirmLabel: 'Unlock editing',
      });
      if (!pw) return;
      try {
        const res = await new Promise<{ token: string }>((resolve, reject) =>
          this.admin.unlockEditor(pw).subscribe({ next: resolve, error: reject })
        );
        this.admin.setEditorToken(res.token);
        this.ui.toast('🔓 Editing unlocked for this session.', 'success');
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        this.ui.toast(
          status === 401 ? 'Wrong edit password.' : 'Could not unlock editing.',
          'error'
        );
        return;
      }
    }
    this.editingCamper.set(c);
  }

  closeEditor(): void {
    if (this.savingEdit()) return;
    this.editingCamper.set(null);
  }

  saveEdit(payload: CamperEditPayload): void {
    const c = this.editingCamper();
    if (!c) return;
    this.savingEdit.set(true);
    this.admin.editCamper(c.id, payload).subscribe({
      next: (res) => {
        this.savingEdit.set(false);
        // Optimistically patch the row from the payload we just sent so the
        // table reflects the edit without a full refetch.
        this.campers.set(
          this.campers().map((row) =>
            row.id === c.id ? { ...row, ...this.applyPayload(row, payload) } : row
          )
        );
        this.editingCamper.set(null);
        if (res.changed === 0) {
          this.ui.toast('No changes to save.', 'info');
        } else {
          this.ui.toast(
            `✓ Saved ${res.changed} change${res.changed === 1 ? '' : 's'} — family emailed & sheet synced.`,
            'success'
          );
        }
      },
      error: (err) => {
        this.savingEdit.set(false);
        const status = err?.status;
        if (status === 401) {
          this.ui.toast('Session expired — sign in again.', 'error');
        } else if (status === 403) {
          // Editor token expired/invalid — re-lock so the next edit re-prompts.
          this.admin.clearEditorToken();
          this.ui.toast('Editing locked — unlock again to save.', 'error');
        } else {
          this.ui.toast('Failed to save changes.', 'error');
        }
      },
    });
  }

  // Maps an edit payload back onto an AdminCamper row for the optimistic UI
  // patch. Blank optionals become null (matching how the server persists them).
  private applyPayload(row: AdminCamper, p: CamperEditPayload): Partial<AdminCamper> {
    const n = (v: string | undefined): string | null => (v && v.trim() ? v : null);
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      parentEmail: p.parentEmail,
      friends: p.friends ?? [],
      dob: n(p.dob),
      gender: n(p.gender),
      age: n(p.age),
      grade: n(p.grade),
      email: n(p.email),
      camperCell: n(p.camperCell),
      medical: n(p.medical),
      tshirt: n(p.tshirt),
      church: n(p.church),
      generalInfo: n(p.generalInfo),
      parentName: n(p.parentName),
      parentPhone: n(p.parentPhone),
      consentEmergencyName: n(p.consentEmergencyName),
      consentEmergencyContact: n(p.consentEmergencyContact),
      consentMedicalAidName: n(p.consentMedicalAidName),
      consentMedicalAidNumber: n(p.consentMedicalAidNumber),
    };
  }
}
