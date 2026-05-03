import { Component, computed, ElementRef, inject, signal, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService, AdminCamper, EmailBlock } from '../admin.service';
import { UiService } from '../../ui/ui.service';

type Filter = 'all' | 'paid' | 'unpaid' | 'consent' | 'no-consent';

@Component({
  selector: 'app-bulk-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container mx-auto p-6 max-w-7xl">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Power Camp Admin — Bulk email</h1>
        <button type="button" (click)="logout()" class="saga-btn-ghost text-sm underline cursor-pointer">
          Sign out
        </button>
      </div>

      <nav class="flex gap-4 mb-6 text-sm" style="border-bottom: 1px solid var(--color-saga-border)">
        <a routerLink="/admin" class="saga-tab no-underline">Campers</a>
        <a routerLink="/admin/leaders" class="saga-tab no-underline">Leaders</a>
        <span class="saga-tab is-active">Bulk email</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- LEFT: Recipients -->
        <section class="saga-card p-4 lg:col-span-1">
          <h2 class="text-lg font-semibold mb-3">Recipients</h2>

          <label class="block text-xs mb-1" style="color: var(--color-saga-text-muted)">Year</label>
          <select [(ngModel)]="selectedYear" class="rounded-lg w-full px-3 py-2 mb-3">
            <option [value]="0">All years</option>
            @for (y of years(); track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>

          <label class="block text-xs mb-1" style="color: var(--color-saga-text-muted)">Filter</label>
          <select [(ngModel)]="filter" class="rounded-lg w-full px-3 py-2 mb-3">
            <option value="all">All campers</option>
            <option value="paid">Paid only</option>
            <option value="unpaid">Unpaid only</option>
            <option value="consent">Consent given</option>
            <option value="no-consent">Consent missing</option>
          </select>

          <div class="text-xs mb-2" style="color: var(--color-saga-text-muted)">
            {{ selected().size }} of {{ filtered().length }} selected
          </div>
          <div class="flex gap-2 mb-3">
            <button type="button" (click)="selectAll()" class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs">
              Select all
            </button>
            <button type="button" (click)="clearSelection()" class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs">
              Clear
            </button>
          </div>

          <div
            class="overflow-y-auto rounded-lg border"
            style="border-color: var(--color-saga-border); max-height: 460px;"
          >
            @if (loading()) {
              <div class="p-3 text-sm" style="color: var(--color-saga-text-muted)">Loading…</div>
            } @else if (filtered().length === 0) {
              <div class="p-3 text-sm" style="color: var(--color-saga-text-muted)">
                No campers match this filter.
              </div>
            } @else {
              @for (c of filtered(); track c.id) {
                <label class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5">
                  <input
                    type="checkbox"
                    [checked]="selected().has(c.id)"
                    (change)="toggle(c.id, $any($event.target).checked)"
                    class="h-4 w-4"
                  />
                  <div class="flex-1 text-xs">
                    <div>{{ c.firstName }} {{ c.lastName }}</div>
                    <div class="font-mono" style="color: var(--color-saga-text-muted)">{{ c.parentEmail }}</div>
                  </div>
                  <span class="text-xs" style="color: var(--color-saga-text-muted)">{{ c.year }}</span>
                </label>
              }
            }
          </div>
        </section>

        <!-- MIDDLE: Composer -->
        <section class="saga-card p-4 lg:col-span-1">
          <h2 class="text-lg font-semibold mb-3">Compose</h2>

          <label class="block text-xs mb-1" style="color: var(--color-saga-text-muted)">
            Subject <span style="color: var(--color-saga-warning)">*</span>
          </label>
          <input
            [(ngModel)]="subject"
            (ngModelChange)="onSubjectChange()"
            placeholder="e.g. Packing reminder for Power Camp 2026"
            class="rounded-lg w-full px-3 py-2 mb-1"
            [class.ng-invalid]="!subject.trim()"
            [class.ng-touched]="true"
          />
          @if (!subject.trim()) {
            <p class="text-xs mb-3" style="color: var(--color-saga-warning)">
              Required — what subscribers see in their inbox.
            </p>
          } @else {
            <div class="mb-3"></div>
          }

          <div class="flex flex-wrap gap-2 mb-3">
            <button type="button" (click)="addBlock('heading')" class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs">+ Heading</button>
            <button type="button" (click)="addBlock('paragraph')" class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs">+ Paragraph</button>
            <button type="button" (click)="addBlock('button')" class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs">+ Button</button>
            <button type="button" (click)="addBlock('divider')" class="saga-btn saga-btn-secondary !py-1 !px-2 !text-xs">+ Divider</button>
          </div>

          <div class="space-y-3">
            @for (b of blocks(); track b.id; let i = $index) {
              <div class="rounded-lg p-3" style="background-color: var(--color-saga-surface-2); border: 1px solid var(--color-saga-border);">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs uppercase" style="color: var(--color-saga-text-muted)">{{ b.kind }}</span>
                  <div class="flex gap-1">
                    <button type="button" (click)="moveBlock(i, -1)" [disabled]="i === 0" class="text-xs px-1" style="background: none; border: none; color: var(--color-saga-text-muted); cursor: pointer;">↑</button>
                    <button type="button" (click)="moveBlock(i, 1)" [disabled]="i === blocks().length - 1" class="text-xs px-1" style="background: none; border: none; color: var(--color-saga-text-muted); cursor: pointer;">↓</button>
                    <button type="button" (click)="removeBlock(i)" class="text-xs px-1" style="background: none; border: none; color: var(--color-saga-danger); cursor: pointer;">×</button>
                  </div>
                </div>

                @if (b.kind === 'heading') {
                  <input
                    [(ngModel)]="b.text"
                    (ngModelChange)="onBlocksChange()"
                    placeholder="Heading text"
                    class="rounded-lg w-full px-3 py-2 text-sm"
                  />
                } @else if (b.kind === 'paragraph') {
                  <textarea
                    [(ngModel)]="b.text"
                    (ngModelChange)="onBlocksChange()"
                    rows="3"
                    placeholder="Paragraph text — newlines are preserved"
                    class="rounded-lg w-full px-3 py-2 text-sm"
                  ></textarea>
                } @else if (b.kind === 'button') {
                  <input
                    [(ngModel)]="b.text"
                    (ngModelChange)="onBlocksChange()"
                    placeholder="Button label"
                    class="rounded-lg w-full px-3 py-2 text-sm mb-2"
                  />
                  <input
                    [(ngModel)]="b.url"
                    (ngModelChange)="onBlocksChange()"
                    placeholder="https://…"
                    type="url"
                    class="rounded-lg w-full px-3 py-2 text-sm"
                  />
                } @else if (b.kind === 'divider') {
                  <div class="text-xs" style="color: var(--color-saga-text-muted)">— horizontal rule —</div>
                }
              </div>
            } @empty {
              <p class="text-sm" style="color: var(--color-saga-text-muted)">
                No blocks yet — add a heading or paragraph to start.
              </p>
            }
          </div>

          <div class="flex flex-col gap-2 mt-6">
            <button
              type="button"
              (click)="send()"
              [disabled]="!canSend() || sending()"
              class="saga-btn saga-btn-primary"
            >
              {{ sending() ? 'Sending…' : 'Send to ' + selected().size + ' recipient' + (selected().size === 1 ? '' : 's') }}
            </button>
            @if (lastResult(); as r) {
              <p class="text-xs" style="color: var(--color-saga-success)">
                ✓ Sent to {{ r.sent }} of {{ r.totalRecipients }}.
                @if (r.unsubscribedSkipped > 0) {
                  <span style="color: var(--color-saga-text-muted)">
                    {{ r.unsubscribedSkipped }} unsubscribed (skipped).
                  </span>
                }
                @if (r.failed.length > 0) {
                  <span style="color: var(--color-saga-danger)">{{ r.failed.length }} failed.</span>
                }
              </p>
            }
          </div>
        </section>

        <!-- RIGHT: Preview -->
        <section class="saga-card p-4 lg:col-span-1">
          <h2 class="text-lg font-semibold mb-3">Preview</h2>
          <div
            class="overflow-hidden rounded-lg"
            style="height: 600px; background: white;"
            [hidden]="!previewHtml()"
          >
            <iframe
              #previewIframe
              title="Email preview"
              class="w-full h-full"
              style="border: 0;"
            ></iframe>
          </div>
          @if (!previewHtml()) {
            <p class="text-sm" style="color: var(--color-saga-text-muted)">
              Add a subject and at least one block to see a preview.
            </p>
          }
        </section>
      </div>
    </div>
  `,
  styles: ``,
})
export class BulkEmailComponent {
  // Recipient state
  campers = signal<AdminCamper[]>([]);
  loading = signal(true);
  selectedYear = 0;
  filter: Filter = 'all';
  selected = signal<Set<number>>(new Set());

  years = computed(() => {
    const set = new Set(this.campers().map((c) => c.year));
    return Array.from(set).sort((a, b) => b - a);
  });

  filtered = computed(() => {
    let rows = this.campers();
    if (this.selectedYear && this.selectedYear !== 0) {
      rows = rows.filter((c) => c.year === Number(this.selectedYear));
    }
    switch (this.filter) {
      case 'paid':
        rows = rows.filter((c) => c.paymentReceivedAt);
        break;
      case 'unpaid':
        rows = rows.filter((c) => !c.paymentReceivedAt);
        break;
      case 'consent':
        rows = rows.filter((c) => c.consentAcceptedAt);
        break;
      case 'no-consent':
        rows = rows.filter((c) => !c.consentAcceptedAt);
        break;
    }
    return rows;
  });

  // Composer state
  subject = '';
  blocks = signal<(EmailBlock & { id: number })[]>([]);
  private nextBlockId = 1;

  // Preview / send state
  previewHtml = signal<string | null>(null);
  previewIframe = viewChild<ElementRef<HTMLIFrameElement>>('previewIframe');
  sending = signal(false);
  lastResult = signal<{ sent: number; totalRecipients: number; unsubscribedSkipped: number; failed: { to: string; error: string }[] } | null>(null);
  private debounceTimer?: number;

  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  constructor() {
    // Imperatively write the preview HTML into the iframe — [srcdoc] gets
    // sanitised/cleared by Angular's binding for some browser/version
    // combos, so we use document.write to bypass that path entirely.
    effect(() => {
      const html = this.previewHtml();
      const ifr = this.previewIframe()?.nativeElement;
      if (!ifr) return;
      const doc = ifr.contentDocument;
      if (!doc) return;
      if (!html) {
        doc.open();
        doc.close();
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
    });

    this.admin.list().subscribe({
      next: (res) => {
        this.campers.set(res.campers);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.admin.clearToken();
          this.router.navigate(['/admin/login']);
        }
      },
    });
  }

  toggle(id: number, on: boolean): void {
    const next = new Set(this.selected());
    if (on) next.add(id);
    else next.delete(id);
    this.selected.set(next);
  }

  selectAll(): void {
    this.selected.set(new Set(this.filtered().map((c) => c.id)));
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  addBlock(kind: EmailBlock['kind']): void {
    const id = this.nextBlockId++;
    const blank: Record<EmailBlock['kind'], EmailBlock> = {
      heading: { kind: 'heading', text: 'Hello, parents' },
      paragraph: { kind: 'paragraph', text: '' },
      button: { kind: 'button', text: 'View update', url: 'https://' },
      divider: { kind: 'divider' },
    };
    this.blocks.update((bs) => [...bs, { ...blank[kind], id }]);
    this.refreshPreview();
  }

  removeBlock(i: number): void {
    this.blocks.update((bs) => bs.filter((_, idx) => idx !== i));
    this.refreshPreview();
  }

  moveBlock(i: number, direction: -1 | 1): void {
    const arr = [...this.blocks()];
    const j = i + direction;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.blocks.set(arr);
    this.refreshPreview();
  }

  onSubjectChange(): void {
    this.refreshPreview();
  }

  onBlocksChange(): void {
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => this.fetchPreview(), 350);
  }

  private fetchPreview(): void {
    if (!this.subject.trim() || this.blocks().length === 0) {
      this.previewHtml.set(null);
      return;
    }
    const blocks = this.blocks().map(({ id: _id, ...rest }) => rest as EmailBlock);
    this.admin.bulkEmailPreview(this.subject, blocks).subscribe({
      next: (res) => this.previewHtml.set(res.html),
      error: () => this.previewHtml.set(null),
    });
  }

  canSend(): boolean {
    return this.subject.trim().length > 0 && this.blocks().length > 0 && this.selected().size > 0;
  }

  async send(): Promise<void> {
    if (!this.canSend()) return;
    const ok = await this.ui.confirm(
      `Send "${this.subject}" to ${this.selected().size} recipient(s)? This kicks off real emails.`,
      'Send it',
      'Cancel'
    );
    if (!ok) return;

    const blocks = this.blocks().map(({ id: _id, ...rest }) => rest as EmailBlock);
    const recipients = this.campers()
      .filter((c) => this.selected().has(c.id))
      .map((c) => c.parentEmail);

    this.sending.set(true);
    this.lastResult.set(null);
    this.admin.bulkEmailSend(this.subject, blocks, recipients).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.lastResult.set(res);
        if (res.failed.length === 0) {
          this.ui.toast(`✓ Sent to ${res.sent} of ${res.totalRecipients}.`, 'success', 5000);
        } else {
          this.ui.toast(`Sent to ${res.sent} of ${res.totalRecipients}; ${res.failed.length} failed.`, 'error', 8000);
        }
      },
      error: (err) => {
        this.sending.set(false);
        this.ui.toast(err?.status === 401 ? 'Session expired — sign in again.' : 'Bulk send failed.', 'error');
      },
    });
  }

  logout(): void {
    this.admin.clearToken();
    this.router.navigate(['/admin/login']);
  }
}
