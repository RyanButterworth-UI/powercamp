import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface VerifiedCamper {
  id: number;
  year: number;
  firstName: string;
  lastName: string;
  email: string | null;
  parentEmail: string;
  parentName: string | null;
  grade: string | null;
  church: string | null;
}

@Component({
  selector: 'app-verify-link',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-6 max-w-2xl">
      @if (loading()) {
        <div class="text-gray-500" data-testid="verifying">Verifying your link…</div>
      } @else if (error()) {
        <div class="rounded border border-red-200 bg-red-50 p-4" data-testid="error">
          <h2 class="font-semibold text-red-900 mb-1">Link no longer works</h2>
          <p class="text-sm text-red-900 mb-3">{{ error() }}</p>
          <button
            type="button"
            (click)="goHome()"
            class="px-4 py-2 rounded border border-red-300 text-red-700"
          >
            Go back to search
          </button>
        </div>
      } @else if (camper()) {
        <div class="rounded border border-green-200 bg-green-50 p-4" data-testid="verified">
          <h2 class="font-semibold text-green-900 mb-1">You're signed in</h2>
          <p class="text-sm text-green-900 mb-3">
            Welcome back, {{ camper()!.firstName }} {{ camper()!.lastName }}. We'll prefill your
            registration with what we have on file from {{ camper()!.year }}.
          </p>
          <button
            type="button"
            (click)="goHome()"
            class="px-4 py-2 rounded bg-green-300 text-green-900"
          >
            Continue to my registration
          </button>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class VerifyLinkComponent {
  loading = signal(true);
  camper = signal<VerifiedCamper | null>(null);
  error = signal<string | null>(null);

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('No token found in the URL.');
      return;
    }

    this.http
      .post<{ camper: VerifiedCamper }>(`${environment.baseApi}/verify-link`, { token })
      .subscribe({
        next: (res) => {
          this.camper.set(res.camper);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          if (err?.status === 401) {
            this.error.set('This link is invalid or has expired. Please request a new one.');
          } else if (err?.status === 404) {
            this.error.set('We could not find your registration. Please contact the camp organisers.');
          } else {
            this.error.set('Something went wrong verifying your link. Please try again.');
          }
        },
      });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
