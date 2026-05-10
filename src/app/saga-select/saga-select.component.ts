import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface SagaSelectOption {
  value: string;
  label: string;
}

/**
 * Custom select with full control over the popped-open menu.
 *   • mobile (< sm) — native <select> (still the best UX on touch devices)
 *   • desktop (≥ sm) — button + popover listbox (matches the dark theme)
 *
 * Both views write to the same bound FormControl so consumers don't care
 * which view the user touched.
 */
@Component({
  selector: 'app-saga-select',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="block saga-select-wrap" #wrap>
      <button
        type="button"
        (click)="toggle()"
        class="saga-select"
        [class.is-open]="open()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="open()"
        data-testid="saga-select-trigger"
      >
        <span [class.is-placeholder]="!selectedLabel()">
          {{ selectedLabel() || placeholder() }}
        </span>
      </button>

      @if (open()) {
        <div
          class="saga-select-menu"
          role="listbox"
          data-testid="saga-select-menu"
        >
          @if (enableSearch()) {
            <input
              #searchInput
              type="text"
              [value]="searchQuery()"
              (input)="onSearch($event)"
              (keydown.escape)="onEscape()"
              placeholder="Search…"
              class="saga-select-search"
              data-testid="saga-select-search"
            />
          }
          @for (opt of filteredOptions(); track opt.value) {
            <button
              type="button"
              role="option"
              (click)="select(opt.value)"
              class="saga-select-option"
              [class.is-selected]="opt.value === control().value"
              [attr.aria-selected]="opt.value === control().value"
              [attr.data-testid]="'saga-select-option-' + opt.value"
            >
              {{ opt.label }}
            </button>
          } @empty {
            <div
              class="saga-select-empty"
              data-testid="saga-select-empty"
            >No matches</div>
          }
        </div>
      }
    </div>
  `,
})
export class SagaSelectComponent implements AfterViewInit {
  control = input.required<FormControl>();
  options = input.required<SagaSelectOption[]>();
  placeholder = input<string>('Select…');
  enableSearch = input<boolean>(false);

  open = signal(false);
  searchQuery = signal('');

  private readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  // Re-renders the trigger label whenever the bound control's value changes.
  private readonly value = signal<unknown>(null);

  selectedLabel = computed(() => {
    const v = this.value();
    return this.options().find((o) => o.value === v)?.label ?? '';
  });

  filteredOptions = computed<SagaSelectOption[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => o.label.toLowerCase().includes(q));
  });

  ngAfterViewInit(): void { /* noop — focus handled in constructor effect */ }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  constructor() {
    effect((onCleanup) => {
      this.value.set(this.control().value);
      const sub = this.control().valueChanges.subscribe((v) => this.value.set(v));
      onCleanup(() => sub.unsubscribe());
    });

    // Clear search whenever the menu closes — fresh state every open.
    effect(() => {
      if (!this.open()) {
        this.searchQuery.set('');
      } else if (this.enableSearch()) {
        // Auto-focus the search input the first frame after open.
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      }
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  select(value: string): void {
    this.control().setValue(value);
    this.open.set(false);
  }

  onEscape(): void {
    this.open.set(false);
  }

  // Click-outside — closes the menu when the user taps anywhere outside the
  // wrapper. Uses 'mousedown' so we close before the trigger's click handler
  // would re-open.
  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (!this.open()) return;
    const wrap = this.wrap()?.nativeElement;
    if (wrap && !wrap.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onDocKeydownEscape(): void {
    this.onEscape();
  }
}
