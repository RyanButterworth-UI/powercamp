import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-6 max-w-md">
      <h1 class="text-2xl font-bold mb-1">Admin sign in</h1>
      <p class="text-sm text-gray-500 mb-4">Enter the admin password to manage registrations.</p>

      <input
        type="password"
        [formControl]="passwordControl"
        (keyup.enter)="login()"
        placeholder="Password"
        autocomplete="current-password"
        class="border rounded px-3 py-2 w-full mb-3"
      />

      @if (error()) {
        <div class="text-sm text-red-700 mb-3" data-testid="login-error">{{ error() }}</div>
      }

      <button
        type="button"
        (click)="login()"
        [disabled]="loading() || !passwordControl.value"
        class="w-full bg-green-300 text-green-900 px-6 py-2 rounded disabled:bg-gray-200 disabled:text-gray-400"
      >
        {{ loading() ? 'Signing in…' : 'Sign in' }}
      </button>
    </div>
  `,
  styles: ``,
})
export class AdminLoginComponent {
  passwordControl = new FormControl('', Validators.required);
  loading = signal(false);
  error = signal<string | null>(null);

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

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
