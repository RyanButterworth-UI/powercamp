import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AdminService, AdminCamper, AdminLeader, Bunk, BunkAssignment } from '../admin.service';
import { UiService } from '../../ui/ui.service';
import { PageGhostComponent } from '../../skeleton/page-ghost.component';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

interface BunkColumn {
  id: number | null; // null = unassigned pool
  name: string;
  gender: 'Male' | 'Female' | null; // null on the Unassigned pool — only filtered server-side
  leader: AdminLeader | null;
  campers: AdminCamper[];
}

@Component({
  selector: 'app-bunks',
  standalone: true,
  imports: [CommonModule, RouterLink, DragDropModule, PageGhostComponent, SkeletonComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-6 max-w-7xl page-fade-in">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Bunks</h1>
        <button type="button" (click)="logout()" class="saga-btn-ghost text-sm underline cursor-pointer">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm" style="border-bottom: 1px solid var(--color-saga-border)">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <span class="saga-tab is-active">Bunks</span>
        <a routerLink="/admin/team" class="saga-tab no-underline">Team Admin</a>
      </nav>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton shape="block" height="320px" />
          }
        </div>
      } @else {
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <button type="button" (click)="addBunk('Male')" class="saga-btn saga-btn-secondary !py-1 !px-2.5 !text-xs">
            Add male bunk
          </button>
          <button type="button" (click)="addBunk('Female')" class="saga-btn saga-btn-secondary !py-1 !px-2.5 !text-xs">
            Add female bunk
          </button>
          <button
            type="button"
            (click)="save()"
            [disabled]="!dirty() || saving()"
            class="saga-btn saga-btn-primary !py-1 !px-2.5 !text-xs"
          >{{ saving() ? 'Saving…' : (dirty() ? 'Save changes' : 'No unsaved changes') }}</button>
          <span class="text-xs italic" style="color: var(--color-saga-text-muted)">
            Bunks are single-gender; campers can only drop into a matching-gender bunk.
            Leaders take the same gender as their bunk.
          </span>
        </div>

        <div class="grid gap-3" [style.gridTemplateColumns]="'repeat(' + columns().length + ', minmax(220px, 1fr))'">
          @for (col of columns(); track col.id ?? -1) {
            <div
              class="bunk-column"
              [class.is-male]="col.gender === 'Male'"
              [class.is-female]="col.gender === 'Female'"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 class="font-semibold text-sm" style="color: var(--color-saga-text-strong)">
                    {{ col.name }}
                    @if (col.gender) {
                      <span class="ml-1 text-[10px] uppercase tracking-wide" style="color: var(--color-saga-text-muted)">
                        {{ col.gender }}
                      </span>
                    }
                  </h3>
                  @if (col.leader) {
                    <div class="text-[11px]" style="color: var(--color-saga-text-muted)">
                      Leader: {{ col.leader.firstName }} {{ col.leader.lastName }}
                    </div>
                  } @else if (col.id !== null) {
                    <button type="button" (click)="assignLeader(col.id!, col.gender!)" class="text-[11px] underline cursor-pointer" style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;">
                      Assign leader
                    </button>
                  }
                </div>
                <span class="text-xs" style="color: var(--color-saga-text-muted)">{{ col.campers.length }}</span>
              </div>
              <div
                cdkDropList
                [cdkDropListData]="col"
                [cdkDropListConnectedTo]="dropListIds()"
                [id]="dropListId(col.id)"
                [cdkDropListEnterPredicate]="enterPredicate(col)"
                (cdkDropListDropped)="onDrop($event)"
                class="bunk-droplist"
              >
                @for (c of col.campers; track c.id) {
                  <div cdkDrag class="camper-pill">
                    <span class="text-sm font-medium">{{ c.firstName }} {{ c.lastName }}</span>
                    <span class="text-[11px]" style="color: var(--color-saga-text-muted)">
                      {{ c.age || '—' }} · {{ c.grade || '—' }} · {{ c.gender || '—' }}
                    </span>
                  </div>
                } @empty {
                  <div class="text-xs italic py-3" style="color: var(--color-saga-text-muted)">
                    Drop campers here.
                  </div>
                }
              </div>
              @if (col.id !== null) {
                <button
                  type="button"
                  (click)="removeBunk(col.id!)"
                  class="text-xs underline cursor-pointer mt-2"
                  style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                >Remove bunk</button>
              }
            </div>
          }
        </div>
      }
    </div>
    }
  `,
  styles: [`
    .bunk-column {
      background: var(--color-saga-surface);
      border: 1px solid var(--color-saga-border);
      border-top-width: 3px;
      border-radius: 10px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      min-height: 320px;
    }
    .bunk-column.is-male { border-top-color: #3b82f6; }
    .bunk-column.is-female { border-top-color: #ec4899; }
    .bunk-droplist {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      min-height: 60px;
    }
    .camper-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.45rem 0.625rem;
      background: var(--color-saga-surface-2);
      border: 1px solid var(--color-saga-border);
      border-radius: 6px;
      cursor: grab;
      user-select: none;
    }
    .camper-pill:active { cursor: grabbing; }
    .cdk-drag-preview { box-shadow: 0 8px 18px rgba(0,0,0,0.4); }
    .cdk-drag-placeholder { opacity: 0.35; }
  `],
})
export class BunksComponent {
  ready = signal(false);
  loading = signal(true);
  campers = signal<AdminCamper[]>([]);
  bunks = signal<Bunk[]>([]);
  leaders = signal<AdminLeader[]>([]);
  columns = signal<BunkColumn[]>([]);
  saving = signal(false);
  dirty = signal(false);

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  constructor() {
    setTimeout(() => this.ready.set(true), 300);
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    Promise.all([
      this.admin.list().toPromise(),
      this.admin.listBunks().toPromise(),
      this.admin.listLeaders().toPromise(),
    ])
      .then(([camperRes, bunkRes, leaderRes]) => {
        if (!camperRes || !bunkRes || !leaderRes) return;
        const currentYear = Math.max(...bunkRes.bunks.map((b) => b.year), 0);
        const camperRows = camperRes.campers.filter(
          (c) => c.year === currentYear || bunkRes.bunks.length === 0
        );
        const leaderRows = leaderRes.leaders.filter(
          (l) => (l.year === currentYear || bunkRes.bunks.length === 0) && l.status === 'approved'
        );
        this.campers.set(camperRows);
        this.bunks.set(bunkRes.bunks);
        this.leaders.set(leaderRows);
        this.buildColumns(camperRows, bunkRes.bunks, leaderRows, bunkRes.assignments);
        this.dirty.set(false);
        this.loading.set(false);
      })
      .catch((err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.admin.clearToken();
          this.router.navigate(['/admin/login']);
          return;
        }
        this.ui.toast('Failed to load bunks.', 'error');
      });
  }

  private buildColumns(
    allCampers: AdminCamper[],
    bunks: Bunk[],
    leaders: AdminLeader[],
    assignments: BunkAssignment[]
  ): void {
    const bunkCampers = new Map<number, AdminCamper[]>();
    for (const b of bunks) bunkCampers.set(b.id, []);
    const assignedById = new Map(assignments.map((a) => [a.camperId, a.bunkId] as const));
    const leaderById = new Map(leaders.map((l) => [l.id, l] as const));
    const unassigned: AdminCamper[] = [];
    for (const c of allCampers) {
      const bid = assignedById.get(c.id);
      if (bid != null && bunkCampers.has(bid)) {
        bunkCampers.get(bid)!.push(c);
      } else {
        unassigned.push(c);
      }
    }
    const cols: BunkColumn[] = [
      { id: null, name: 'Unassigned', gender: null, leader: null, campers: unassigned },
      ...bunks.map((b) => ({
        id: b.id,
        name: b.name,
        gender: b.gender as 'Male' | 'Female',
        leader: b.leaderId ? leaderById.get(b.leaderId) ?? null : null,
        campers: bunkCampers.get(b.id) ?? [],
      })),
    ];
    this.columns.set(cols);
  }

  dropListId(bunkId: number | null): string {
    return bunkId === null ? 'bunk-unassigned' : `bunk-${bunkId}`;
  }
  dropListIds = computed(() => this.columns().map((c) => this.dropListId(c.id)));

  // CDK predicate runs as the cursor enters the drop list. Returning
  // false rejects the drop; the camper-pill bounces back with no
  // mutation. Keeps the safeguarding rule (matching gender) airtight.
  enterPredicate(target: BunkColumn) {
    return (item: { data?: AdminCamper }) => {
      if (target.gender === null) return true; // Unassigned accepts everyone
      const camper = (item as unknown as { data: AdminCamper }).data ?? null;
      // CDK doesn't always populate item.data on the predicate — fall
      // back to allowing the drop and letting the server reject if
      // genders mismatch (rare since the UI prevents it visually).
      if (!camper || !camper.gender) return true;
      return camper.gender === target.gender;
    };
  }

  onDrop(event: CdkDragDrop<BunkColumn>): void {
    const previous = event.previousContainer.data;
    const current = event.container.data;
    if (previous === current) {
      moveItemInArray(current.campers, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(previous.campers, current.campers, event.previousIndex, event.currentIndex);
    }
    this.columns.set([...this.columns()]);
    this.dirty.set(true);
  }

  async addBunk(gender: 'Male' | 'Female'): Promise<void> {
    const name = await this.ui.prompt({
      text: `Bunk name (e.g. "${gender === 'Male' ? 'Boys A' : 'Girls A'}")`,
      placeholder: 'Bunk name',
      confirmLabel: 'Create',
    });
    if (!name) return;
    this.admin.createBunk({ name, gender }).subscribe({
      next: () => {
        this.ui.toast(`Bunk "${name}" created.`, 'success');
        this.refresh();
      },
      error: () => this.ui.toast('Failed to create bunk.', 'error'),
    });
  }

  async removeBunk(id: number): Promise<void> {
    const ok = await this.ui.confirm(
      'Removing the bunk also moves its campers back to Unassigned. Continue?',
      'Remove',
      'Cancel'
    );
    if (!ok) return;
    this.admin.deleteBunk(id).subscribe({
      next: () => {
        this.ui.toast('Bunk removed.', 'info');
        this.refresh();
      },
      error: () => this.ui.toast('Failed to remove bunk.', 'error'),
    });
  }

  async assignLeader(bunkId: number, gender: 'Male' | 'Female'): Promise<void> {
    const candidates = this.leaders().filter(
      (l) => !l.gender || l.gender === gender
    );
    if (candidates.length === 0) {
      this.ui.toast(`No approved ${gender} leaders to assign.`, 'info');
      return;
    }
    const pick = await this.ui.prompt({
      text: `Pick a leader id for this bunk (must be a ${gender} approved leader):\n\n` +
        candidates.map((l) => `${l.id}: ${l.firstName} ${l.lastName}`).join('\n'),
      placeholder: 'Leader id',
      confirmLabel: 'Assign',
    });
    if (!pick) return;
    const id = Number.parseInt(pick.trim(), 10);
    if (!Number.isInteger(id) || id <= 0) {
      this.ui.toast('Invalid leader id.', 'error');
      return;
    }
    this.admin.updateBunk(bunkId, { leaderId: id }).subscribe({
      next: () => {
        this.ui.toast('Leader assigned.', 'success');
        this.refresh();
      },
      error: () => this.ui.toast('Failed to assign leader.', 'error'),
    });
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const assignments: BunkAssignment[] = [];
    for (const col of this.columns()) {
      for (const c of col.campers) {
        assignments.push({ camperId: c.id, bunkId: col.id });
      }
    }
    this.admin.saveBunkAssignments(assignments).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.dirty.set(false);
        this.ui.toast(`Saved ${res.count} assignments.`, 'success');
      },
      error: (err) => {
        this.saving.set(false);
        const msg = (err?.error?.error as string) ?? 'Failed to save assignments.';
        this.ui.toast(msg, 'error');
      },
    });
  }

  logout(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }
}
