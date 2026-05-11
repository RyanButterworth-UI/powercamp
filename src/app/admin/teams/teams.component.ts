import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AdminService, AdminCamper, AdminLeader, Team, TeamAssignment } from '../admin.service';
import { UiService } from '../../ui/ui.service';
import { PageGhostComponent } from '../../skeleton/page-ghost.component';
import { SkeletonComponent } from '../../skeleton/skeleton.component';

// One column per team plus a virtual "Unassigned" pool. The component
// owns its own per-column arrays of campers; the source of truth lives
// in the unsavedChanges signal until the admin clicks Save.
interface TeamColumn {
  id: number | null; // null = the "Unassigned" pool
  name: string;
  color: string | null;
  // Resolved leader for the captainLeaderId on the team. null when the
  // team hasn't picked one yet (or this is the Unassigned column).
  captain: AdminLeader | null;
  campers: AdminCamper[];
}

const TEAM_PALETTE = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, RouterLink, DragDropModule, PageGhostComponent, SkeletonComponent],
  template: `
    @if (!ready()) {
      <app-page-ghost />
    } @else {
    <div class="container mx-auto p-6 max-w-7xl page-fade-in">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Teams</h1>
        <button type="button" (click)="logout()" class="saga-btn-ghost text-sm underline cursor-pointer">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-4 text-sm overflow-x-auto whitespace-nowrap" style="border-bottom: 1px solid var(--color-saga-border); -webkit-overflow-scrolling: touch;">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <a routerLink="/admin/bulk-email" class="saga-tab no-underline">Bulk email</a>
        <span class="saga-tab is-active">Teams</span>
        <a routerLink="/admin/bunks" class="saga-tab no-underline">Bunks</a>
      </nav>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          @for (i of [1,2,3,4,5]; track i) {
            <app-skeleton shape="block" height="320px" />
          }
        </div>
      } @else {
        <!-- Narrow-viewport banner. Drag-drop kanban needs hover + space
             for 5 side-by-side columns, neither of which work on a
             phone. We hide it on md+ where the grid actually fits. -->
        <div class="md:hidden mb-4 p-3 rounded-md text-sm"
             style="background: var(--color-saga-primary-soft); border: 1px solid var(--color-saga-action); color: var(--color-saga-text);">
          <strong>Heads up:</strong> Teams is built for drag-and-drop on a
          tablet or desktop. Everything below will load, but moving campers
          between teams won't be comfortable on a phone-sized screen.
        </div>

        <div class="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            (click)="addTeam()"
            [disabled]="teams().length >= 4"
            class="saga-btn saga-btn-secondary !py-1 !px-2.5 !text-xs"
            [title]="teams().length >= 4 ? 'Power Camp runs four teams — remove one before adding another' : 'Add a new team'"
          >Add team</button>
          @if (teams().length === 0) {
            <button
              type="button"
              (click)="quickStart()"
              class="saga-btn saga-btn-primary !py-1 !px-2.5 !text-xs"
              title="Create the four standard Power Camp teams"
            >Quick start (4 teams)</button>
          }
          <button
            type="button"
            (click)="autoBalance()"
            class="saga-btn saga-btn-secondary !py-1 !px-2.5 !text-xs"
            [disabled]="columns().length < 2"
            title="Spread campers across teams by age, keeping declared friend pairs together where possible"
          >Auto-balance</button>
          <button
            type="button"
            (click)="save()"
            [disabled]="!dirty() || saving()"
            class="saga-btn saga-btn-primary !py-1 !px-2.5 !text-xs"
          >{{ saving() ? 'Saving…' : (dirty() ? 'Save changes' : 'No unsaved changes') }}</button>
          <span class="text-xs italic" style="color: var(--color-saga-text-muted)">
            Drag campers between columns. Auto-balance uses the friends list each parent gave us
            and tries to keep declared friends on the same team.
          </span>
        </div>

        <!-- Auto-fill grid so columns wrap into rows on narrower viewports
             (iPad portrait gets ~3 across, landscape ~4, desktop the full 5).
             Previously the grid was fixed at N columns and overflowed to a
             horizontal scroll on iPad. -->
        <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
          @for (col of columns(); track col.id ?? -1) {
            <div
              class="team-column"
              [style.borderTopColor]="col.color || 'var(--color-saga-border-strong)'"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-block rounded-full"
                      [style.backgroundColor]="col.color || 'var(--color-saga-border-strong)'"
                      style="width: 10px; height: 10px;"
                      [class.invisible]="col.id === null"
                    ></span>
                    <h3 class="font-semibold text-sm" style="color: var(--color-saga-text-strong)">
                      {{ col.name }}
                    </h3>
                  </div>
                  @if (col.id !== null) {
                    @if (col.captain) {
                      <div class="flex items-center gap-2 text-[11px] mt-0.5" style="color: var(--color-saga-text-muted)">
                        <span>Captain: {{ col.captain.firstName }} {{ col.captain.lastName }}</span>
                        <button
                          type="button"
                          (click)="togglePicker(col.id!)"
                          class="underline cursor-pointer"
                          style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                        >Change</button>
                      </div>
                    } @else {
                      <button
                        type="button"
                        (click)="togglePicker(col.id!)"
                        class="text-[11px] underline cursor-pointer mt-0.5"
                        style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                      >Assign captain</button>
                    }
                  }
                </div>
                <span class="text-xs" style="color: var(--color-saga-text-muted)">
                  {{ col.campers.length }}
                </span>
              </div>

              @if (col.id !== null && pickerFor() === col.id) {
                <fieldset class="mb-2 p-2 rounded" style="border: 1px solid var(--color-saga-border); background: var(--color-saga-surface-2);">
                  <legend class="px-1 text-[11px] uppercase tracking-wide" style="color: var(--color-saga-text-muted)">
                    Pick a captain
                  </legend>
                  <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    @for (l of leaders(); track l.id) {
                      <label class="leader-radio">
                        <input
                          type="radio"
                          [name]="'team-captain-' + col.id"
                          [checked]="col.captain?.id === l.id"
                          (change)="setCaptain(col.id!, l.id)"
                        />
                        <span class="text-sm">{{ l.firstName }} {{ l.lastName }}</span>
                      </label>
                    } @empty {
                      <span class="text-xs italic" style="color: var(--color-saga-text-muted)">
                        No approved leaders. Approve some on the Leaders tab first.
                      </span>
                    }
                  </div>
                  @if (col.captain) {
                    <button
                      type="button"
                      (click)="clearCaptain(col.id!)"
                      class="text-[11px] underline cursor-pointer mt-2"
                      style="background: none; border: none; color: var(--color-saga-danger); padding: 0;"
                    >Remove captain</button>
                  }
                </fieldset>
              }
              <div
                cdkDropList
                [cdkDropListData]="col"
                [cdkDropListConnectedTo]="dropListIds()"
                [id]="dropListId(col.id)"
                (cdkDropListDropped)="onDrop($event)"
                class="team-droplist"
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
                        (click)="removeFromTeam(c, col)"
                        title="Remove from this team"
                        aria-label="Remove from this team"
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
                  (click)="removeTeam(col.id!)"
                  class="text-xs underline cursor-pointer mt-2"
                  style="background: none; border: none; color: var(--color-saga-text-muted); padding: 0;"
                >Remove team</button>
              }
            </div>
          }
        </div>
      }
    </div>
    }
  `,
  styles: [`
    .team-column {
      background: var(--color-saga-surface);
      border: 1px solid var(--color-saga-border);
      border-top-width: 3px;
      border-radius: 10px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      min-height: 320px;
    }
    .team-droplist {
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
    .cdk-drag-preview {
      box-shadow: 0 8px 18px rgba(0,0,0,0.4);
    }
    .cdk-drag-placeholder {
      opacity: 0.35;
    }
    .cdk-drop-list-dragging .camper-pill:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
})
export class TeamsComponent {
  ready = signal(false);
  loading = signal(true);
  campers = signal<AdminCamper[]>([]);
  teams = signal<Team[]>([]);
  // The interactive working copy. We never mutate teams() / campers()
  // directly while dragging — only this columns() signal — so a pending
  // assignment can be discarded by reloading.
  columns = signal<TeamColumn[]>([]);
  saving = signal(false);
  // True whenever the on-screen columns differ from the last saved
  // assignment snapshot. Drives the Save button's enabled state.
  dirty = signal(false);
  // Approved leaders eligible to captain a team (any gender — teams are
  // mixed-gender). Loaded alongside campers + teams in refresh().
  leaders = signal<AdminLeader[]>([]);
  // Which team currently has its inline captain-picker expanded.
  // null = no picker is open. Toggling clicks the same team closed.
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
      this.admin.listTeams().toPromise(),
      this.admin.listLeaders().toPromise(),
    ])
      .then(([camperRes, teamRes, leaderRes]) => {
        if (!camperRes || !teamRes || !leaderRes) return;
        // Filter to current camp year for both: only assigning campers for the active cohort.
        const currentYear = Math.max(...teamRes.teams.map((t) => t.year), 0);
        const camperRows = camperRes.campers.filter((c) => c.year === currentYear || teamRes.teams.length === 0);
        const leaderRows = leaderRes.leaders.filter(
          (l) => (l.year === currentYear || teamRes.teams.length === 0) && l.status === 'approved'
        );
        this.campers.set(camperRows);
        this.teams.set(teamRes.teams);
        this.leaders.set(leaderRows);
        this.buildColumns(camperRows, teamRes.teams, leaderRows, teamRes.assignments);
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
        this.ui.toast('Failed to load teams.', 'error');
      });
  }

  private buildColumns(
    allCampers: AdminCamper[],
    teams: Team[],
    leaders: AdminLeader[],
    assignments: TeamAssignment[]
  ): void {
    const teamCampers = new Map<number, AdminCamper[]>();
    for (const t of teams) teamCampers.set(t.id, []);
    const assignedById = new Map(assignments.map((a) => [a.camperId, a.teamId] as const));
    const leaderById = new Map(leaders.map((l) => [l.id, l] as const));
    const unassigned: AdminCamper[] = [];
    for (const c of allCampers) {
      const tid = assignedById.get(c.id);
      if (tid != null && teamCampers.has(tid)) {
        teamCampers.get(tid)!.push(c);
      } else {
        unassigned.push(c);
      }
    }
    const cols: TeamColumn[] = [
      { id: null, name: 'Unassigned', color: null, captain: null, campers: unassigned },
      ...teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        captain: t.captainLeaderId ? leaderById.get(t.captainLeaderId) ?? null : null,
        campers: teamCampers.get(t.id) ?? [],
      })),
    ];
    this.columns.set(cols);
  }

  togglePicker(teamId: number): void {
    this.pickerFor.set(this.pickerFor() === teamId ? null : teamId);
  }

  setCaptain(teamId: number, leaderId: number): void {
    this.admin.updateTeam(teamId, { captainLeaderId: leaderId }).subscribe({
      next: () => {
        this.ui.toast('Captain assigned.', 'success');
        this.pickerFor.set(null);
        this.refresh();
      },
      error: () => this.ui.toast('Failed to assign captain.', 'error'),
    });
  }

  clearCaptain(teamId: number): void {
    this.admin.updateTeam(teamId, { captainLeaderId: null }).subscribe({
      next: () => {
        this.ui.toast('Captain cleared.', 'info');
        this.pickerFor.set(null);
        this.refresh();
      },
      error: () => this.ui.toast('Failed to clear captain.', 'error'),
    });
  }

  // Stable drop list IDs so CDK can wire the connected-to graph.
  // null (Unassigned) gets a fixed id; teams use their numeric id.
  dropListId(teamId: number | null): string {
    return teamId === null ? 'team-unassigned' : `team-${teamId}`;
  }
  dropListIds = computed(() => this.columns().map((c) => this.dropListId(c.id)));

  onDrop(event: CdkDragDrop<TeamColumn>): void {
    const previous = event.previousContainer.data;
    const current = event.container.data;
    if (previous === current) {
      moveItemInArray(current.campers, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(previous.campers, current.campers, event.previousIndex, event.currentIndex);
    }
    // Refresh signal reference so Angular re-renders.
    this.columns.set([...this.columns()]);
    this.dirty.set(true);
  }

  // Pulls the camper out of this team and back into the Unassigned pool.
  // Mirrors the drag-and-drop transfer; persisted on Save.
  removeFromTeam(c: AdminCamper, fromCol: TeamColumn): void {
    if (fromCol.id === null) return;
    const cols = this.columns();
    const unassigned = cols.find((x) => x.id === null);
    if (!unassigned) return;
    fromCol.campers = fromCol.campers.filter((x) => x.id !== c.id);
    unassigned.campers = [...unassigned.campers, c];
    this.columns.set([...cols]);
    this.dirty.set(true);
  }

  // ----- Team CRUD -----
  async addTeam(): Promise<void> {
    // Hard cap at 4: Power Camp runs four teams. The button is also
    // disabled past this in the template — this is the belt-and-braces
    // guard for anyone clicking via DOM tools or programmatic submit.
    if (this.teams().length >= 4) {
      this.ui.toast('Power Camp runs four teams — remove one before adding another.', 'info');
      return;
    }
    const name = await this.ui.prompt({
      text: 'Team name (e.g. "Phoenix")',
      placeholder: 'Team name',
      confirmLabel: 'Create',
    });
    if (!name) return;
    const usedColors = new Set(this.teams().map((t) => t.color).filter(Boolean) as string[]);
    const color = TEAM_PALETTE.find((c) => !usedColors.has(c)) ?? TEAM_PALETTE[0];
    this.admin.createTeam({ name, color }).subscribe({
      next: () => {
        this.ui.toast(`Team "${name}" created.`, 'success');
        this.refresh();
      },
      error: () => this.ui.toast('Failed to create team.', 'error'),
    });
  }

  // One-click bootstrap when no teams exist yet. Creates the four
  // standard names with the standard colour palette, then refreshes —
  // saves the admin from typing the same names every year.
  quickStart(): void {
    const defaults: { name: string; color: string }[] = [
      { name: 'Phoenix', color: TEAM_PALETTE[0] },
      { name: 'Lions', color: TEAM_PALETTE[1] },
      { name: 'Eagles', color: TEAM_PALETTE[2] },
      { name: 'Rhinos', color: TEAM_PALETTE[3] },
    ];
    Promise.all(
      defaults.map(
        (d) => new Promise<void>((resolve, reject) => {
          this.admin.createTeam(d).subscribe({ next: () => resolve(), error: reject });
        })
      )
    )
      .then(() => {
        this.ui.toast('Created the four standard teams.', 'success');
        this.refresh();
      })
      .catch(() => this.ui.toast('Failed to create default teams.', 'error'));
  }

  async removeTeam(id: number): Promise<void> {
    const ok = await this.ui.confirm(
      'Removing the team also moves its campers back to Unassigned. Continue?',
      'Remove',
      'Cancel'
    );
    if (!ok) return;
    this.admin.deleteTeam(id).subscribe({
      next: () => {
        this.ui.toast('Team removed.', 'info');
        this.refresh();
      },
      error: () => this.ui.toast('Failed to remove team.', 'error'),
    });
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const assignments: TeamAssignment[] = [];
    for (const col of this.columns()) {
      for (const c of col.campers) {
        assignments.push({ camperId: c.id, teamId: col.id });
      }
    }
    this.admin.saveTeamAssignments(assignments).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.dirty.set(false);
        this.ui.toast(`Saved ${res.count} assignments.`, 'success');
      },
      error: () => {
        this.saving.set(false);
        this.ui.toast('Failed to save assignments.', 'error');
      },
    });
  }

  // ----- Auto-balance -----
  // Spreads campers across the existing teams so each ends up with
  // roughly the same count and similar age mix. As a soft preference,
  // declared friend-pairs are placed on the same team where it doesn't
  // break the count balance — friends-from-the-form was the most-asked
  // ergonomic from the parent feedback in 2024.
  autoBalance(): void {
    const cols = this.columns().filter((c) => c.id !== null);
    if (cols.length < 2) {
      this.ui.toast('Add at least two teams first.', 'info');
      return;
    }

    // Pull every camper into a single pool, then redistribute. Working on
    // a fresh Map per column avoids accidental references to the existing
    // arrays.
    const pool: AdminCamper[] = this.columns().flatMap((c) => c.campers);
    // Sort by age desc so we deal the oldest campers first round-robin —
    // distributing the "anchor" campers evenly before the younger ones.
    pool.sort((a, b) => Number(b.age ?? 0) - Number(a.age ?? 0));

    const newCols = new Map<number, AdminCamper[]>();
    for (const c of cols) newCols.set(c.id!, []);
    const teamIds = Array.from(newCols.keys());

    // Group by name → camperId for friend-lookup.
    const byName = new Map<string, AdminCamper>();
    for (const c of pool) {
      byName.set(`${c.firstName} ${c.lastName}`.toLowerCase().trim(), c);
    }

    const placed = new Set<number>();
    let cursor = 0;

    for (const camper of pool) {
      if (placed.has(camper.id)) continue;
      // Find the next team in round-robin order that has the smallest
      // current size. Using min-by-size rather than strict round-robin
      // keeps the distribution flat even after we co-place friend pairs.
      const teamId = teamIds.reduce((bestId, id) =>
        newCols.get(id)!.length < newCols.get(bestId)!.length ? id : bestId,
      teamIds[cursor % teamIds.length]);
      newCols.get(teamId)!.push(camper);
      placed.add(camper.id);
      cursor++;

      // Pull declared friends onto the same team where capacity allows.
      // "Capacity" here is "no team has >2 fewer campers than this one"
      // — past that, balance wins over togetherness.
      for (const friendName of camper.friends ?? []) {
        const f = byName.get(friendName.toLowerCase().trim());
        if (!f || placed.has(f.id)) continue;
        const min = Math.min(...teamIds.map((id) => newCols.get(id)!.length));
        if (newCols.get(teamId)!.length - min >= 2) continue;
        newCols.get(teamId)!.push(f);
        placed.add(f.id);
      }
    }

    // Project back into columns(). The "Unassigned" pool is now empty
    // because we placed everyone.
    const next: TeamColumn[] = this.columns().map((col) => ({
      ...col,
      campers: col.id === null ? [] : newCols.get(col.id) ?? [],
    }));
    this.columns.set(next);
    this.dirty.set(true);
    this.ui.toast('Auto-balanced — review and Save when ready.', 'success');
  }

  logout(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }
}
