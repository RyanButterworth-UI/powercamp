import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LookupResult, StepKey } from '../../models';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div
      class="customer-wrapper p-6"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <h1 class="text-3xl font-bold mb-1">Power Camp 2026</h1>
      <p class="mb-1 text-sm" style="color: var(--color-saga-text-muted)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>
      <p class="mb-6 text-sm" style="color: var(--color-saga-text-muted)">
        Been to Power Camp before? Search for your name and we'll pick up where you left off.
      </p>

      <div class="flex gap-2 mb-4">
        <input
          type="text"
          [formControl]="queryControl"
          (keyup.enter)="search()"
          placeholder="First or last name"
          class="rounded-lg px-3 py-2 w-full"
          autocomplete="off"
        />
        <button
          type="button"
          (click)="search()"
          [disabled]="loading() || !queryControl.value?.trim()"
          class="saga-btn saga-btn-primary"
        >
          {{ loading() ? 'Searching…' : 'Search' }}
        </button>
      </div>

      @if (error()) {
        <div class="text-red-600 mb-4" data-testid="error">{{ error() }}</div>
      }

      @if (linkSentTo() !== null) {
        <div
          class="saga-card p-4 mb-6"
          data-testid="link-sent"
          style="border-color: var(--color-saga-primary); background-color: var(--color-saga-primary-soft)"
        >
          <h2 class="font-semibold mb-1">Check your email</h2>
          <p class="text-sm" style="color: var(--color-saga-text)">
            We've sent a sign-in link to <span class="font-mono">{{ linkSentTo() }}</span>.
            Click the link in that email (it expires in 30 minutes) to access your registration.
          </p>
        </div>
      } @else if (results() !== null) {
        @if (results()!.length === 0) {
          <div class="mb-4" style="color: var(--color-saga-text-muted)" data-testid="no-results">
            No matches. Try a different name, or use one of the options below.
          </div>
        } @else {
          <p class="text-xs mb-2" style="color: var(--color-saga-text-muted)">
            🔒 For privacy, only the email already linked to the camper can edit the registration.
            Hit Register and we'll send a sign-in link to that email.
          </p>
          <ul
            class="saga-card divide-y mb-6"
            data-testid="results"
            style="border-color: var(--color-saga-border)"
          >
            @for (r of results(); track r.id) {
              <li class="p-3 flex items-center justify-between" style="border-color: var(--color-saga-border)">
                <div>
                  <div class="font-medium" style="color: var(--color-saga-text-strong)">
                    {{ r.firstName }} {{ r.lastName }}
                  </div>
                  <div class="text-sm" style="color: var(--color-saga-text-muted)">
                    {{ r.year }} · {{ r.parentEmailMasked }}
                  </div>
                </div>
                <button
                  type="button"
                  class="saga-btn saga-btn-primary !py-1 !px-3 !text-xs"
                  [disabled]="sendingLinkFor() === r.id"
                  (click)="select(r)"
                >
                  {{ sendingLinkFor() === r.id ? 'Sending…' : 'Register' }}
                </button>
              </li>
            }
          </ul>
        }
      }

      <!-- Always-visible fallback options. New campers and leader applicants don't
           need to search first — they can jump straight in. -->
      <div
        class="mt-2 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style="border-top: 1px solid var(--color-saga-border)"
      >
        <div class="text-sm" style="color: var(--color-saga-text-muted)">
          First time? No problem.
        </div>
        <div class="flex flex-col sm:flex-row gap-3 sm:w-auto">
          <button
            type="button"
            (click)="registerNew()"
            class="saga-btn saga-btn-secondary w-full sm:w-auto"
          >
            Register as a new camper
          </button>
          <a
            routerLink="/leader-apply"
            class="saga-btn saga-btn-secondary no-underline w-full sm:w-auto"
          >
            Apply as a leader
          </a>
        </div>
      </div>

      @if (hasDraft()) {
        <div class="mt-4 text-xs text-right">
          <button
            type="button"
            (click)="startOver()"
            class="saga-btn-ghost underline"
            style="color: var(--color-saga-text-muted); background: none; border: none; cursor: pointer; padding: 0;"
          >
            We saved your draft from earlier — clear and start over
          </button>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class LookupComponent {
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  selectedCamper = output<LookupResult>();

  queryControl = new FormControl('');
  results = signal<LookupResult[] | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  sendingLinkFor = signal<number | null>(null);
  linkSentTo = signal<string | null>(null);

  private readonly http = inject(HttpClient);

  search() {
    const q = (this.queryControl.value ?? '').trim();
    if (!q) return;

    this.loading.set(true);
    this.error.set(null);
    this.results.set(null);

    this.http
      .post<{ results: LookupResult[] }>(`${environment.baseApi}/lookup`, { q })
      .subscribe({
        next: (res) => {
          this.results.set(res.results);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Search failed. Please try again.');
          this.loading.set(false);
        },
      });
  }

  select(r: LookupResult) {
    this.selectedCamper.emit(r);
    this.sendingLinkFor.set(r.id);
    this.error.set(null);

    this.http.post<{ ok: boolean }>(`${environment.baseApi}/request-link`, { camperId: r.id }).subscribe({
      next: () => {
        this.sendingLinkFor.set(null);
        this.linkSentTo.set(r.parentEmailMasked);
      },
      error: () => {
        this.sendingLinkFor.set(null);
        this.error.set("Couldn't send the sign-in link. Please try again.");
      },
    });
  }

  registerNew() {
    this.goToStep.emit(StepKey.Intro);
  }

  hasDraft(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('powercamp.form.draft');
    if (!raw) return false;
    try {
      const v = JSON.parse(raw);
      // Only show the "clear" link if at least one user-typed field is present.
      return !!(
        v?.firstName || v?.lastName || v?.parentEmail || v?.parentName || v?.email
      );
    } catch {
      return false;
    }
  }

  startOver(): void {
    localStorage.removeItem('powercamp.form.draft');
    window.location.reload();
  }
}
