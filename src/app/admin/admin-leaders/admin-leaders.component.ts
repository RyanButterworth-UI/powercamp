import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminLeader, AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-leaders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Leaders</h1>
        <button type="button" (click)="logout()" class="text-sm text-gray-600 underline">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 border-b border-gray-200 mb-4 text-sm">
        <a routerLink="/admin" class="px-1 py-2 text-gray-500 hover:text-gray-700">Campers</a>
        <span class="px-1 py-2 border-b-2 border-green-500 text-green-700 font-semibold">
          Leaders
        </span>
      </nav>

      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <button
          type="button"
          (click)="showAddForm.set(!showAddForm())"
          class="bg-green-300 text-green-900 px-4 py-2 rounded"
          data-testid="toggle-add"
        >
          {{ showAddForm() ? 'Close' : '＋ Add a leader directly (Neil only)' }}
        </button>
        <span class="text-sm text-gray-500">{{ total() }} leaders in the database</span>
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
        <div class="text-gray-500" data-testid="loading">Loading leaders…</div>
      } @else if (loadError()) {
        <div class="text-red-700" data-testid="load-error">{{ loadError() }}</div>
      } @else {
        @if (years().length > 0) {
          <div class="border-b border-gray-200 mb-3" data-testid="leader-year-tabs">
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
                >
                  {{ y }}
                  <span class="ml-1 text-xs text-gray-400">({{ countByYear()[y] }})</span>
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
                      [style.color]="
                        l.status === 'approved' ? 'var(--color-saga-success)'
                        : l.status === 'rejected' ? 'var(--color-saga-danger)'
                        : 'var(--color-saga-warning)'
                      "
                    >
                      {{ l.status }}
                    </span>
                  </td>
                  <td>
                    @if (l.approvedByNeil) {
                      <span style="color: var(--color-saga-success)">✓</span>
                    } @else {
                      <span style="color: var(--color-saga-text-muted)">—</span>
                    }
                  </td>
                  <td>
                    @if (l.status !== 'approved') {
                      <button
                        type="button"
                        (click)="approve(l)"
                        class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs mr-1"
                      >
                        Approve
                      </button>
                    }
                    @if (l.status !== 'rejected') {
                      <button
                        type="button"
                        (click)="reject(l)"
                        class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs"
                      >
                        Reject
                      </button>
                    }
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

  approve(l: AdminLeader): void {
    const pw = window.prompt(`Enter Neil's password to approve ${l.firstName} ${l.lastName}:`);
    if (!pw) return;
    this.admin.approveLeader(l.id, pw).subscribe({
      next: () => this.refresh(),
      error: (err) => {
        window.alert(err?.status === 401 ? 'Wrong Neil password.' : 'Failed to approve.');
      },
    });
  }

  reject(l: AdminLeader): void {
    const pw = window.prompt(`Enter Neil's password to reject ${l.firstName} ${l.lastName}:`);
    if (!pw) return;
    this.admin.rejectLeader(l.id, pw).subscribe({
      next: () => this.refresh(),
      error: (err) => {
        window.alert(err?.status === 401 ? 'Wrong Neil password.' : 'Failed to reject.');
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
}
