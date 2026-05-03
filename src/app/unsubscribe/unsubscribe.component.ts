import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-unsubscribe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto p-6 max-w-xl">
      <div class="saga-card p-6">
        @if (loading()) {
          <p class="text-sm" style="color: var(--color-saga-text-muted)">Working on it…</p>
        } @else if (error()) {
          <h1 class="text-lg font-semibold mb-2">Hmm, that link didn't work</h1>
          <p class="text-sm" style="color: var(--color-saga-text-muted)">{{ error() }}</p>
        } @else {
          <h1 class="text-lg font-semibold mb-2">You're unsubscribed</h1>
          <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
            We've removed <span class="font-mono">{{ email() }}</span> from our bulk email list.
            Registration confirmations and payment receipts will still come through — those are
            transactional, not promotional.
          </p>
          <p class="text-sm mb-4" style="color: var(--color-saga-text-muted)">
            Changed your mind? Reach the camp organisers and we'll re-enable it.
          </p>
          <a routerLink="/" class="saga-btn saga-btn-secondary no-underline">Back to Power Camp</a>
        }
      </div>
    </div>
  `,
  styles: ``,
})
export class UnsubscribeComponent {
  loading = signal(true);
  error = signal<string | null>(null);
  email = signal<string | null>(null);

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('No token in the URL — open the link from your email.');
      return;
    }
    this.http.post<{ ok: boolean; email: string }>(`${environment.baseApi}/unsubscribe`, { token }).subscribe({
      next: (res) => {
        this.email.set(res.email);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.status === 401
            ? 'This link is invalid or expired. Use the latest email we sent you.'
            : 'Something went wrong. Please try again.'
        );
      },
    });
  }
}
