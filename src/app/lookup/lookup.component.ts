import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LookupResult, StepKey } from '../../models';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="customer-wrapper p-6"
      [class.opacity-0]="!stepVisible()"
      [class.opacity-100]="stepVisible()"
    >
      <h1 class="text-3xl font-bold mb-2 text-gray-900">Power Camp 2026</h1>
      <p class="mb-6 text-md text-gray-500">
        Have you been to Power Camp before? Search for your name to pick up where you left off.
      </p>

      <div class="flex gap-2 mb-4">
        <input
          type="text"
          [formControl]="queryControl"
          (keyup.enter)="search()"
          placeholder="First or last name"
          class="border rounded px-3 py-2 w-full"
          autocomplete="off"
        />
        <button
          type="button"
          (click)="search()"
          [disabled]="loading() || !queryControl.value?.trim()"
          class="bg-green-300 text-green-900 px-6 py-2 rounded disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {{ loading() ? 'Searching…' : 'Search' }}
        </button>
      </div>

      @if (error()) {
        <div class="text-red-600 mb-4" data-testid="error">{{ error() }}</div>
      }

      @if (linkSentTo() !== null) {
        <div class="rounded border border-green-200 bg-green-50 p-4" data-testid="link-sent">
          <h2 class="font-semibold text-green-900 mb-1">Check your email</h2>
          <p class="text-sm text-green-900">
            We've sent a sign-in link to <span class="font-mono">{{ linkSentTo() }}</span>.
            Click the link in that email (it expires in 30 minutes) to access your registration.
          </p>
        </div>
      } @else if (results() !== null) {
        @if (results()!.length === 0) {
          <div class="text-gray-500 mb-4" data-testid="no-results">
            No matches. You can register as a new camper below.
          </div>
        } @else {
          <ul class="border rounded divide-y" data-testid="results">
            @for (r of results(); track r.id) {
              <li class="p-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div class="font-medium text-gray-900">{{ r.firstName }} {{ r.lastName }}</div>
                  <div class="text-sm text-gray-500">
                    {{ r.year }} · {{ r.parentEmailMasked }}
                  </div>
                </div>
                <button
                  type="button"
                  class="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded disabled:bg-gray-200 disabled:text-gray-400"
                  [disabled]="sendingLinkFor() === r.id"
                  (click)="select(r)"
                >
                  {{ sendingLinkFor() === r.id ? 'Sending…' : 'This is me' }}
                </button>
              </li>
            }
          </ul>
        }

        <button
          type="button"
          (click)="registerNew()"
          class="mt-6 px-6 py-2 rounded border border-gray-300 text-gray-600"
        >
          Register as a new camper
        </button>
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
}
