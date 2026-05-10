import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminLeader, AdminService } from '../admin.service';
import { UiService } from '../../ui/ui.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

@Component({
  selector: 'app-admin-leaders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SkeletonComponent],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Leaders</h1>
        <button type="button" (click)="logout()" class="text-sm text-gray-600 underline">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm" style="border-bottom: 1px solid var(--color-saga-border)">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <span class="saga-tab is-active">Leaders</span>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/team" class="saga-tab no-underline">Team Admin</a>
      </nav>

      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <button
          type="button"
          (click)="showAddForm.set(!showAddForm())"
          class="saga-btn saga-btn-primary"
          data-testid="toggle-add"
        >
          {{ showAddForm() ? 'Close' : 'Add a leader directly (Neil only)' }}
        </button>
        <span class="text-sm" style="color: var(--color-saga-text-muted)">{{ total() }} leaders in the database</span>
      </div>

      @if (showAddForm()) {
        <form [formGroup]="addForm" (ngSubmit)="directAdd()" class="border rounded p-4 mb-6 bg-gray-50">
          <h2 class="font-semibold mb-3">Direct add (auto-approved)</h2>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col text-sm">First Name *
              <input formControlName="firstName" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Last Name *
              <input formControlName="lastName" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm col-span-2">Email *
              <input formControlName="email" class="border rounded px-2 py-1" type="email" />
            </label>
            <label class="flex flex-col text-sm">Cell
              <input formControlName="cell" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Gender
              <input formControlName="gender" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">Church
              <input formControlName="church" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm">T-shirt
              <input formControlName="tshirt" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm col-span-2">Notes
              <input formControlName="applicationNotes" class="border rounded px-2 py-1" />
            </label>
            <label class="flex flex-col text-sm col-span-2">Neil's password *
              <input
                formControlName="neilPassword"
                type="password"
                class="border rounded px-2 py-1"
                placeholder="Required to add a leader directly"
              />
            </label>
          </div>

          @if (addError()) {
            <div class="mt-3 text-sm text-red-700" data-testid="add-error">{{ addError() }}</div>
          }

          <div class="flex justify-end gap-2 mt-4">
            <button
              type="button"
              (click)="showAddForm.set(false)"
              class="px-4 py-2 rounded border border-gray-300 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="addForm.invalid || addBusy()"
              class="px-6 py-2 rounded bg-green-300 text-green-900 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {{ addBusy() ? 'Adding…' : 'Add leader' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <!-- Skeleton table — 6 placeholder rows + a year-tab row above so
             the page doesn't reflow when the real data arrives. -->
        <div data-testid="loading" class="flex flex-col gap-3">
          <div class="flex gap-2 mb-1">
            <app-skeleton width="3.5rem" height="20px" />
            <app-skeleton width="3.5rem" height="20px" />
          </div>
          @for (i of [1,2,3,4,5,6]; track i) {
            <app-skeleton shape="block" height="44px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="text-red-700" data-testid="load-error">{{ loadError() }}</div>
      } @else {
        @if (years().length > 0) {
          <div class="mb-3" data-testid="leader-year-tabs" style="border-bottom: 1px solid var(--color-saga-border)">
            <nav class="flex gap-1">
              @for (y of years(); track y) {
                <button
                  type="button"
                  (click)="selectedYear.set(y)"
                  class="saga-tab"
                  [class.is-active]="selectedYear() === y"
                >
                  {{ y }}
                  <span class="ml-1 text-xs" style="color: var(--color-saga-text-muted)">({{ countByYear()[y] }})</span>
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
                <th>Email</th>
                <th>Status</th>
                <th>By Neil</th>
                <th class="w-48">Actions</th>
              </tr>
            </thead>
            <tbody data-testid="leaders-rows">
              @for (l of visibleLeaders(); track l.id) {
                <tr>
                  <td>{{ l.firstName }} {{ l.lastName }}</td>
                  <td class="font-mono text-xs">
                    <span class="inline-flex items-center gap-1.5">
                      <span>{{ l.email }}</span>
                      <button
                        type="button"
                        (click)="copyEmail(l.email)"
                        [title]="copiedEmail() === l.email ? 'Copied!' : 'Copy email'"
                        class="cursor-pointer p-1 rounded hover:bg-white/5"
                        style="background: none; border: none;"
                      >
                        @if (copiedEmail() === l.email) {
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
                  <td>
                    <span
                      class="status-pill"
                      [class.is-ok]="l.status === 'approved'"
                      [class.is-bad]="l.status === 'rejected'"
                      [class.is-pending]="l.status !== 'approved' && l.status !== 'rejected'"
                    >{{ l.status }}</span>
                  </td>
                  <td>
                    @if (l.approvedByNeil) {
                      <span class="status-pill is-ok" title="Approved by Neil">✓</span>
                    } @else {
                      <span class="status-pill is-bad" title="Not approved by Neil">!</span>
                    }
                  </td>
                  <td>
                    <span class="inline-flex items-center gap-1.5">
                      @if (l.status !== 'approved') {
                        <button
                          type="button"
                          (click)="approve(l)"
                          class="text-xs px-2 py-1 rounded saga-btn saga-btn-success inline-flex items-center justify-center"
                          style="min-width: 5rem;"
                        >Approve</button>
                      }
                      @if (l.status !== 'rejected') {
                        <button
                          type="button"
                          (click)="reject(l)"
                          class="text-xs px-2 py-1 rounded saga-btn saga-btn-danger inline-flex items-center justify-center"
                          style="min-width: 5rem;"
                        >Reject</button>
                      }
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center py-6" style="color: var(--color-saga-text-muted)">
                    No leaders in this year.
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
export class AdminLeadersComponent {
  leaders = signal<AdminLeader[]>([]);
  total = signal(0);
  loading = signal(true);
  loadError = signal<string | null>(null);
  selectedYear = signal<number | null>(null);

  showAddForm = signal(false);
  addForm: FormGroup;
  addBusy = signal(false);
  addError = signal<string | null>(null);
  copiedEmail = signal<string | null>(null);

  years = computed(() => {
    const set = new Set(this.leaders().map((l) => l.year));
    return Array.from(set).sort((a, b) => b - a);
  });
  countByYear = computed(() => {
    const out: Record<number, number> = {};
    for (const l of this.leaders()) {
      out[l.year] = (out[l.year] ?? 0) + 1;
    }
    return out;
  });
  visibleLeaders = computed(() => {
    const y = this.selectedYear();
    if (y === null) return this.leaders();
    return this.leaders().filter((l) => l.year === y);
  });

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly ui = inject(UiService);

  constructor() {
    this.addForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      cell: [''],
      gender: [''],
      church: [''],
      tshirt: [''],
      applicationNotes: [''],
      neilPassword: ['', Validators.required],
    });

    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.admin.listLeaders().subscribe({
      next: (res) => {
        this.leaders.set(res.leaders);
        this.total.set(res.total);
        const ys = this.years();
        if (ys.length > 0 && this.selectedYear() === null) this.selectedYear.set(ys[0]);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.admin.clearToken();
          this.router.navigate(['/admin/login']);
        } else {
          this.loadError.set('Failed to load leaders.');
        }
      },
    });
  }

  async approve(l: AdminLeader): Promise<void> {
    const pw = await this.ui.prompt({
      text: `Enter Neil's password to approve ${l.firstName} ${l.lastName}:`,
      inputType: 'password',
      placeholder: "Neil's password",
      confirmLabel: 'Approve',
    });
    if (!pw) return;
    this.admin.approveLeader(l.id, pw).subscribe({
      next: () => {
        this.refresh();
        this.ui.toast(`✓ ${l.firstName} approved.`, 'success');
      },
      error: (err) => {
        this.ui.toast(err?.status === 401 ? 'Wrong Neil password.' : 'Failed to approve.', 'error');
      },
    });
  }

  async reject(l: AdminLeader): Promise<void> {
    const pw = await this.ui.prompt({
      text: `Enter Neil's password to reject ${l.firstName} ${l.lastName}:`,
      inputType: 'password',
      placeholder: "Neil's password",
      confirmLabel: 'Reject',
    });
    if (!pw) return;
    this.admin.rejectLeader(l.id, pw).subscribe({
      next: () => {
        this.refresh();
        this.ui.toast(`${l.firstName} rejected.`, 'info');
      },
      error: (err) => {
        this.ui.toast(err?.status === 401 ? 'Wrong Neil password.' : 'Failed to reject.', 'error');
      },
    });
  }

  directAdd(): void {
    if (this.addForm.invalid) return;
    const { neilPassword, ...leader } = this.addForm.getRawValue();
    this.addBusy.set(true);
    this.addError.set(null);
    this.admin.directAddLeader(neilPassword, leader).subscribe({
      next: () => {
        this.addBusy.set(false);
        this.addForm.reset();
        this.showAddForm.set(false);
        this.refresh();
      },
      error: (err) => {
        this.addBusy.set(false);
        this.addError.set(err?.status === 401 ? 'Wrong Neil password.' : 'Failed to add leader.');
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
}
