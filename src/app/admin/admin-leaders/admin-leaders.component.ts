import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminLeader, AdminService } from '../admin.service';
import { UiService } from '../../ui/ui.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

@Component({
  selector: 'app-admin-leaders',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Leaders</h1>
        <button type="button" (click)="logout()" class="text-sm text-gray-600 underline">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm flex-wrap" style="border-bottom: 1px solid var(--color-saga-border); -webkit-overflow-scrolling: touch;">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <span class="saga-tab is-active">Leaders</span>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <a routerLink="/admin/bunks" class="saga-tab no-underline">Bunks</a>
      </nav>

      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <span class="text-sm" style="color: var(--color-saga-text-muted)">
          {{ total() }} leaders in the database — applications come in via the public
          <a routerLink="/leader-apply" style="color: var(--color-saga-action)">leader-apply</a>
          form.
        </span>
      </div>

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
                <th>Payment</th>
                <th>Actions</th>
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
                    @if (l.paymentReceivedAt) {
                      <span
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-success inline-flex items-center justify-center"
                        style="min-width: 6rem;"
                        title="Payment received"
                        [attr.data-testid]="'payment-paid-' + l.id"
                      >Paid</span>
                    } @else {
                      <button
                        type="button"
                        (click)="markPaid(l)"
                        [disabled]="markingPaidFor() === l.id"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-secondary inline-flex items-center justify-center"
                        style="min-width: 6rem;"
                        [attr.data-testid]="'payment-mark-' + l.id"
                      >{{ markingPaidFor() === l.id ? 'Saving…' : 'Mark paid' }}</button>
                    }
                  </td>
                  <td>
                    <!-- Side-by-side, no wrap. The column auto-sizes to fit
                         the row's two buttons (Approve+Reject for pending,
                         Invite+Reject for approved) so we don't stack on
                         narrower viewports. -->
                    <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                      @if (l.status !== 'approved') {
                        <button
                          type="button"
                          (click)="approve(l)"
                          class="text-xs px-2 py-1 rounded saga-btn saga-btn-success inline-flex items-center justify-center"
                          style="width: 5.5rem;"
                        >Approve</button>
                      }
                      @if (l.status === 'approved') {
                        <button
                          type="button"
                          (click)="invite(l)"
                          [disabled]="invitingFor() === l.id"
                          class="text-xs px-2 py-1 rounded saga-btn saga-btn-primary inline-flex items-center justify-center"
                          style="width: 5.5rem;"
                          title="Send a magic-link invite so the leader can finish their registration"
                        >{{ invitingFor() === l.id ? 'Sending…' : 'Invite' }}</button>
                      }
                      @if (l.status !== 'rejected') {
                        <button
                          type="button"
                          (click)="reject(l)"
                          class="text-xs px-2 py-1 rounded saga-btn saga-btn-danger inline-flex items-center justify-center"
                          style="width: 5.5rem;"
                        >Reject</button>
                      }
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center py-6" style="color: var(--color-saga-text-muted)">
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

  copiedEmail = signal<string | null>(null);
  invitingFor = signal<number | null>(null);
  markingPaidFor = signal<number | null>(null);

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
  private readonly ui = inject(UiService);

  constructor() {
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

  async markPaid(l: AdminLeader): Promise<void> {
    const ok = await this.ui.confirm(
      `Mark ${l.firstName} ${l.lastName} as paid? This sends a confirmation email to ${l.email}.`,
      'Mark paid',
      'Cancel'
    );
    if (!ok) return;

    this.markingPaidFor.set(l.id);
    this.admin.markLeaderPaid(l.id).subscribe({
      next: (res) => {
        this.markingPaidFor.set(null);
        // Patch the row in place rather than re-fetching the whole list,
        // mirroring the camper dashboard's optimistic update.
        const updated = this.leaders().map((row) =>
          row.id === l.id ? { ...row, paymentReceivedAt: res.paymentReceivedAt } : row
        );
        this.leaders.set(updated);
        this.ui.toast(`✓ ${l.firstName} ${l.lastName} marked paid — confirmation emailed.`, 'success');
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

  async invite(l: AdminLeader): Promise<void> {
    const pw = await this.ui.prompt({
      text: `Send registration invite to ${l.firstName} ${l.lastName} <${l.email}>?\nNeil's password is required.`,
      inputType: 'password',
      placeholder: "Neil's password",
      confirmLabel: 'Send invite',
    });
    if (!pw) return;
    this.invitingFor.set(l.id);
    this.admin.inviteLeader(l.id, pw).subscribe({
      next: (res) => {
        this.invitingFor.set(null);
        this.ui.toast(`Invite sent to ${res.sentTo}.`, 'success', 3500);
      },
      error: (err) => {
        this.invitingFor.set(null);
        this.ui.toast(
          err?.status === 401 ? 'Wrong Neil password.' : 'Failed to send invite.',
          'error'
        );
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
