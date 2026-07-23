import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, WaitlistEntry } from '../admin.service';
import { askToDelete, deleteErrorMessage } from '../confirm-delete';
import { UiService } from '../../ui/ui.service';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

// Admin Waiting List page. Two jobs:
//   1. The registrations open/closed master switch (closing shows the public
//      form a "registrations closed" screen and blocks new /submit calls).
//   2. The waiting-list table — families who asked to be added once camp
//      filled up, via the closed screen or a manual entry from an email.
@Component({
  selector: 'app-admin-waitlist',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="container mx-auto p-6 max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Waiting list</h1>
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
        <span class="saga-tab is-active">Waiting list</span>
      </nav>

      <!-- Registrations open/closed master switch. -->
      <div
        class="saga-card p-3 mb-6 flex items-center justify-between gap-3 flex-wrap"
        data-testid="registration-toggle"
      >
        <div class="text-sm">
          <span class="font-semibold">Registrations:</span>
          @if (regStatusLoading()) {
            <span style="color: var(--color-saga-text-muted)"> checking…</span>
          } @else {
            <span [style.color]="registrationsOpen() ? 'var(--color-saga-success)' : 'var(--color-saga-danger)'">
              {{ registrationsOpen() ? ' OPEN' : ' CLOSED' }}
            </span>
            <span style="color: var(--color-saga-text-muted)">
              — {{ registrationsOpen()
                ? 'the public form is accepting new registrations.'
                : 'new registrations are blocked; families see the waiting-list screen.' }}
            </span>
          }
        </div>
        <button
          type="button"
          (click)="toggleRegistrations()"
          [disabled]="regStatusLoading() || regStatusSaving()"
          class="saga-btn"
          [class.saga-btn-warning]="registrationsOpen()"
          [class.saga-btn-primary]="!registrationsOpen()"
          data-testid="registration-toggle-btn"
        >
          {{ regStatusSaving() ? 'Saving…' : (registrationsOpen() ? 'Close registrations' : 'Open registrations') }}
        </button>
      </div>

      @if (loading()) {
        <div data-testid="loading" class="flex flex-col gap-3">
          @for (i of [1,2,3,4,5]; track i) {
            <app-skeleton shape="block" height="44px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="text-red-700" data-testid="load-error">{{ loadError() }}</div>
      } @else if (entries().length === 0) {
        <p class="text-sm" data-testid="waitlist-empty" style="color: var(--color-saga-text-muted)">
          No one on the waiting list yet. Entries appear here when a family joins from the
          closed-registrations screen.
        </p>
      } @else {
        <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
          {{ total() }} on the waiting list for {{ currentYearLabel() }}.
        </p>
        <div class="overflow-x-auto">
          <table class="saga-table text-sm" data-testid="waitlist-table">
            <thead>
              <tr>
                <th>Camper</th>
                <th>Parent / guardian</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Grade</th>
                <th>Note</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (e of entries(); track e.id) {
                <tr [attr.data-testid]="'waitlist-row-' + e.id">
                  <td>{{ e.camperName }}</td>
                  <td>{{ e.parentName || '—' }}</td>
                  <td>
                    <a [href]="'mailto:' + e.parentEmail" style="color: var(--color-saga-action)">{{ e.parentEmail }}</a>
                  </td>
                  <td>{{ e.phone || '—' }}</td>
                  <td>{{ e.grade || '—' }}</td>
                  <td>{{ e.note || '—' }}</td>
                  <td>{{ formatDate(e.createdAt) }}</td>
                  <td style="white-space:nowrap;">
                    <div class="inline-flex gap-1.5">
                      <button
                        type="button"
                        (click)="promote(e)"
                        [disabled]="promotingFor() === e.id"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-primary inline-flex items-center justify-center cursor-pointer"
                        [title]="'Move ' + e.camperName + ' to the main camper list and request consent'"
                        [attr.data-testid]="'promote-waitlist-' + e.id"
                      >{{ promotingFor() === e.id ? 'Moving…' : 'Move to main list' }}</button>
                      <button
                        type="button"
                        (click)="remove(e)"
                        [disabled]="deletingFor() === e.id"
                        class="text-xs px-2 py-1 rounded saga-btn saga-btn-danger inline-flex items-center justify-center cursor-pointer"
                        [title]="'Delete ' + e.camperName + ' from the waiting list'"
                        [attr.data-testid]="'delete-waitlist-' + e.id"
                      >{{ deletingFor() === e.id ? 'Deleting…' : 'Delete' }}</button>
                    </div>
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
export class AdminWaitlistComponent {
  entries = signal<WaitlistEntry[]>([]);
  total = signal(0);
  loading = signal(true);
  loadError = signal<string | null>(null);
  deletingFor = signal<number | null>(null);
  promotingFor = signal<number | null>(null);

  regStatusLoading = signal(true);
  regStatusSaving = signal(false);
  registrationsOpen = signal(true);

  private readonly admin = inject(AdminService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  constructor() {
    this.admin.getRegistrationStatus().subscribe({
      next: (res) => {
        this.registrationsOpen.set(res.registrationsOpen);
        this.regStatusLoading.set(false);
      },
      error: (err) => {
        this.regStatusLoading.set(false);
        if (err?.status === 401) this.redirectToLogin();
      },
    });

    this.admin.listWaitlist().subscribe({
      next: (res) => {
        this.entries.set(res.waitlist);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.redirectToLogin();
        } else {
          this.loadError.set('Failed to load the waiting list.');
        }
      },
    });
  }

  async remove(e: WaitlistEntry): Promise<void> {
    const pw = await askToDelete(this.ui, `${e.camperName} from the waiting list`);
    if (!pw) return;

    this.deletingFor.set(e.id);
    this.admin.deleteWaitlistEntry(e.id, pw).subscribe({
      next: () => {
        this.deletingFor.set(null);
        this.entries.set(this.entries().filter((row) => row.id !== e.id));
        this.total.update((n) => Math.max(0, n - 1));
        this.ui.toast(`${e.camperName} removed from the waiting list.`, 'info');
      },
      error: (err) => {
        this.deletingFor.set(null);
        this.ui.toast(deleteErrorMessage(err), 'error');
      },
    });
  }

  // Move an entry onto the main camper list. The backend creates the camper
  // (or reuses an existing one), adds them to the Registrations sheet if not
  // already there, emails the parent a consent link, and removes the entry —
  // so on success we drop the row locally, matching remove().
  async promote(e: WaitlistEntry): Promise<void> {
    const ok = await this.ui.confirm(
      `Move ${e.camperName} to the main camper list?\n\n` +
        `This creates their camper record and emails ${e.parentEmail} a link to complete consent. ` +
        `They'll be removed from the waiting list.`,
      'Move to main list',
      'Cancel'
    );
    if (!ok) return;

    this.promotingFor.set(e.id);
    this.admin.promoteWaitlistEntry(e.id).subscribe({
      next: (res) => {
        this.promotingFor.set(null);
        this.entries.set(this.entries().filter((row) => row.id !== e.id));
        this.total.update((n) => Math.max(0, n - 1));
        const detail = res.alreadyCamper
          ? 'was already registered — consent link sent'
          : 'moved to the main list — consent link sent';
        this.ui.toast(`${e.camperName} ${detail}.`, 'success');
      },
      error: (err) => {
        this.promotingFor.set(null);
        this.ui.toast(
          err?.status === 401
            ? 'Session expired — sign in again.'
            : 'Failed to move to the main list.',
          'error'
        );
      },
    });
  }

  toggleRegistrations(): void {
    const next = !this.registrationsOpen();
    this.regStatusSaving.set(true);
    this.admin.setRegistrationStatus(next).subscribe({
      next: (res) => {
        this.registrationsOpen.set(res.registrationsOpen);
        this.regStatusSaving.set(false);
      },
      error: (err) => {
        this.regStatusSaving.set(false);
        if (err?.status === 401) this.redirectToLogin();
      },
    });
  }

  currentYearLabel(): string {
    return this.entries()[0] ? String(this.entries()[0].year) : 'this year';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString();
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
