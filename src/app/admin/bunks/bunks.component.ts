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

      <nav class="flex gap-4 mb-4 text-sm flex-wrap" style="border-bottom: 1px solid var(--color-saga-border); -webkit-overflow-scrolling: touch;">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <a routerLink="/admin/teams" class="saga-tab no-underline">Teams</a>
        <span class="saga-tab is-active">Bunks</span>
        <a routerLink="/admin/feedback" class="saga-tab no-underline">Feedback</a>
      </nav>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton shape="block" height="320px" />
          }
        </div>
      } @else {
        <!-- Narrow-viewport banner — same reasoning as Teams. Drag-drop
             kanban with single-gender constraints needs a tablet or
             desktop to be usable. -->
        <div class="md:hidden mb-4 p-3 rounded-md text-sm"
             style="background: var(--color-saga-primary-soft); border: 1px solid var(--color-saga-action); color: var(--color-saga-text);">
          <strong>Heads up:</strong> Bunks is built for drag-and-drop on a
          tablet or desktop. Everything below will load, but moving campers
          between bunks won't be comfortable on a phone-sized screen.
        </div>

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

        <!-- Auto-fill grid so bunks wrap into rows on iPad. Each card stays
             at least 220px so camper pills inside remain comfortable; the
             column count adapts to the viewport without horizontal scroll. -->
        <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
          @for (col of columns(); track col.id ?? -1) {
            <div
              class="bunk-column"
              [class.is-male]="col.gender === 'Male'"
              [class.is-female]="col.gender === 'Female'"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-sm" style="color: var(--color-saga-text-strong)">
                    {{ col.name }}
                    @if (col.gender) {
                      <span class="ml-1 text-[10px] uppercase tracking-wide" style="color: var(--color-saga-text-muted)">
                        {{ col.gender }}
                      </span>
                    }
                  </h3>
                  @if (col.leader) {
                    <div class="flex items-center gap-2 text-[11px] mt-0.5" style="color: var(--color-saga-text-muted)">
                      <span>Leader: {{ col.leader.firstName }} {{ col.leader.lastName }}</span>
                      <button
                        type="button"
                        (click)="togglePicker(col.id!)"
                        class="underline cursor-pointer"
                        style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                      >Change</button>
                    </div>
                  } @else if (col.id !== null) {
                    <button
                      type="button"
                      (click)="togglePicker(col.id!)"
                      class="text-[11px] underline cursor-pointer mt-0.5"
                      style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                    >Assign leader</button>
                  }
                </div>
                <span class="text-xs" style="color: var(--color-saga-text-muted)">{{ col.campers.length }}</span>
              </div>

              @if (col.id !== null && pickerFor() === col.id) {
                <fieldset class="mb-2 p-2 rounded" style="border: 1px solid var(--color-saga-border); background: var(--color-saga-surface-2);">
                  <legend class="px-1 text-[11px] uppercase tracking-wide" style="color: var(--color-saga-text-muted)">
                    Pick a {{ col.gender }} leader
                  </legend>
                  <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    @for (l of leadersForGender(col.gender!); track l.id) {
                      <label class="leader-radio">
                        <input
                          type="radio"
                          [name]="'bunk-leader-' + col.id"
                          [checked]="col.leader?.id === l.id"
                          (change)="setLeader(col.id!, l.id)"
                        />
                        <span class="text-sm">{{ l.firstName }} {{ l.lastName }}</span>
                      </label>
                    } @empty {
                      <span class="text-xs italic" style="color: var(--color-saga-text-muted)">
                        No approved {{ col.gender }} leaders. Approve some on the Leaders tab first.
                      </span>
                    }
                  </div>
                  @if (col.leader) {
                    <button
                      type="button"
                      (click)="clearLeader(col.id!)"
                      class="text-[11px] underline cursor-pointer mt-2"
                      style="background: none; border: none; color: var(--color-saga-danger); padding: 0;"
                    >Remove leader</button>
                  }
                </fieldset>
              }
              <div
                cdkDropList
                [cdkDropListData]="col"
                [cdkDropListConnectedTo]="dropListIds()"
                [id]="dropListId(col.id)"
                (cdkDropListDropped)="onDrop($event)"
                class="bunk-droplist"
              >
                @for (c of col.campers; track c.id) {
                  <div cdkDrag [cdkDragData]="c" class="camper-pill">
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-medium">{{ c.firstName }} {{ c.lastName }}</span>
                      <span class="text-[11px]" style="color: var(--color-saga-text-muted)">
                        {{ c.age || '—' }} · {{ c.grade || '—' }} · {{ c.gender || '—' }}
                      </span>
                      @if (c.church) {
                        <span class="text-[11px] truncate" style="color: var(--color-saga-text-muted)" [title]="c.church">
                          {{ c.church }}
                        </span>
                      }
                    </div>
                    @if (col.id !== null) {
                      <button
                        type="button"
                        (click)="removeFromBunk(c, col)"
                        title="Remove from this bunk"
                        aria-label="Remove from this bunk"
                        class="camper-remove"
                      >&times;</button>
                    }
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
    .camper-remove {
      flex: 0 0 auto;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background: transparent;
      border: 1px solid var(--color-saga-border);
      color: var(--color-saga-text-muted);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .camper-remove:hover {
      color: var(--color-saga-danger);
      border-color: var(--color-saga-danger);
    }
    .leader-radio {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.375rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .leader-radio:hover {
      background: var(--color-saga-surface);
    }
    .leader-radio input { accent-color: var(--color-saga-action); }
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
  // Which bunk currently has its inline leader-picker expanded.
  // null = no picker is open. Toggling clicks the same bunk closed.
  pickerFor = signal<number | null>(null);

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

  onDrop(event: CdkDragDrop<BunkColumn>): void {
    const previous = event.previousContainer.data;
    const current = event.container.data;

    // Same-column reorder is always fine.
    if (previous === current) {
      moveItemInArray(current.campers, event.previousIndex, event.currentIndex);
      this.columns.set([...this.columns()]);
      this.dirty.set(true);
      return;
    }

    // Cross-column move — gate on gender BEFORE mutating arrays. Single-
    // gender bunks are a safeguarding rule; surface a real modal so the
    // admin sees the rejection rather than wondering why the pill snapped
    // back. The Unassigned column (gender === null) accepts everyone.
    const camper = previous.campers[event.previousIndex];
    if (current.gender !== null && camper.gender && camper.gender !== current.gender) {
      this.ui.confirm(
        `${camper.firstName} ${camper.lastName} (${camper.gender}) can't go in a ${current.gender} bunk.`,
        'OK',
        ''
      );
      return;
    }

    transferArrayItem(previous.campers, current.campers, event.previousIndex, event.currentIndex);
    this.columns.set([...this.columns()]);
    this.dirty.set(true);
  }

  // Removes the camper from this bunk and drops them in the Unassigned
  // pool. No server call yet — saved with the rest on Save.
  removeFromBunk(c: AdminCamper, fromCol: BunkColumn): void {
    if (fromCol.id === null) return;
    const cols = this.columns();
    const unassigned = cols.find((x) => x.id === null);
    if (!unassigned) return;
    fromCol.campers = fromCol.campers.filter((x) => x.id !== c.id);
    unassigned.campers = [...unassigned.campers, c];
    this.columns.set([...cols]);
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

  togglePicker(bunkId: number): void {
    this.pickerFor.set(this.pickerFor() === bunkId ? null : bunkId);
  }

  // Approved leaders matching this bunk's gender. Leaders with no gender
  // recorded fall through (rare — most have it from the application form).
  leadersForGender(gender: 'Male' | 'Female') {
    return this.leaders().filter((l) => !l.gender || l.gender === gender);
  }

  setLeader(bunkId: number, leaderId: number): void {
    this.admin.updateBunk(bunkId, { leaderId }).subscribe({
      next: () => {
        this.ui.toast('Leader assigned.', 'success');
        this.pickerFor.set(null);
        this.refresh();
      },
      error: () => this.ui.toast('Failed to assign leader.', 'error'),
    });
  }

  clearLeader(bunkId: number): void {
    this.admin.updateBunk(bunkId, { leaderId: null }).subscribe({
      next: () => {
        this.ui.toast('Leader cleared.', 'info');
        this.pickerFor.set(null);
        this.refresh();
      },
      error: () => this.ui.toast('Failed to clear leader.', 'error'),
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
