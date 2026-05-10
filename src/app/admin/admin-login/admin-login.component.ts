import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { PageGhostComponent } from '../../skeleton/page-ghost.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageGhostComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-6 max-w-md page-fade-in">
      <div class="saga-card p-6">
        <h1 class="text-2xl font-bold mb-1">Admin sign in</h1>
        <p class="text-sm mb-4" style="color: var(--color-saga-text-muted)">
          Enter the admin password to manage registrations.
        </p>

        <input
          type="password"
          [formControl]="passwordControl"
          (keyup.enter)="login()"
          placeholder="Password"
          autocomplete="current-password"
          class="rounded-lg px-3 py-2 w-full mb-3"
        />

        @if (error()) {
          <div class="text-sm mb-3" style="color: var(--color-saga-danger)" data-testid="login-error">
            {{ error() }}
          </div>
        }

        <button
          type="button"
          (click)="login()"
          [disabled]="loading() || !passwordControl.value"
          class="saga-btn saga-btn-primary w-full"
        >
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </div>
    </div>
    }
  `,
  styles: ``,
})
export class AdminLoginComponent {
  passwordControl = new FormControl('', Validators.required);
  loading = signal(false);
  error = signal<string | null>(null);
  ready = signal(false);

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
  }

  login(): void {
    const password = (this.passwordControl.value ?? '').trim();
    if (!password) return;

    this.loading.set(true);
    this.error.set(null);

    this.admin.login(password).subscribe({
      next: ({ token }) => {
        this.admin.setToken(token);
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.status === 401 ? 'Wrong password.' : 'Sign-in failed. Please try again.');
      },
    });
  }
}
