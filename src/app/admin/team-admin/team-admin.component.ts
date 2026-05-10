import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../admin.service';
import { PageGhostComponent } from '../../skeleton/page-ghost.component';

@Component({
  selector: 'app-team-admin',
  standalone: true,
  imports: [RouterLink, PageGhostComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-6 max-w-5xl page-fade-in">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Team Admin</h1>
        <button type="button" (click)="logout()" class="saga-btn-ghost text-sm underline cursor-pointer">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm" style="border-bottom: 1px solid var(--color-saga-border)">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <a routerLink="/admin/bunks" class="saga-tab no-underline">Bunks</a>
        <span class="saga-tab is-active">Team Admin</span>
      </nav>

      <div class="p-6 rounded-lg" style="background: var(--color-saga-surface); border: 1px solid var(--color-saga-border);">
        <p style="color: var(--color-saga-text-muted)">Team Admin tools — coming soon.</p>
      </div>
    </div>
    }
  `,
})
export class TeamAdminComponent {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  ready = signal(false);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
  }

  logout(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }
}
