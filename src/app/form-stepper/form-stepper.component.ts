import { Component, ElementRef, EventEmitter, Output, computed, effect, inject, input } from '@angular/core';

export interface StepperStep {
  key: number;
  label: string;
  /** A locked step renders muted + non-clickable. The parent decides — typically
   *  steps that come after the first incomplete required field. */
  locked?: boolean;
}

@Component({
  selector: 'app-form-stepper',
  standalone: true,
  template: `
    <nav class="stepper" aria-label="Registration progress">
      <ol class="stepper-track">
        @for (s of steps(); track s.key; let i = $index) {
          <li class="stepper-item">
            <button
              type="button"
              (click)="stepClick.emit(s.key)"
              [disabled]="!!s.locked"
              class="stepper-step"
              [class.is-current]="s.key === current()"
              [class.is-done]="isDone(i)"
              [class.is-locked]="!!s.locked"
              [attr.aria-current]="s.key === current() ? 'step' : null"
              [attr.aria-disabled]="s.locked ? 'true' : null"
              [attr.data-testid]="'stepper-step-' + s.key"
            >
              <span class="stepper-num" aria-hidden="true">{{ i + 1 }}</span>
              <span class="stepper-label">{{ s.label }}</span>
            </button>
          </li>
        }
      </ol>
    </nav>
  `,
})
export class FormStepperComponent {
  steps = input.required<StepperStep[]>();
  current = input.required<number>();
  @Output() stepClick = new EventEmitter<number>();

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    // Whenever the current step changes, scroll its pill into the centre of
    // the strip. We compute the offset manually instead of using
    // scrollIntoView({ inline: 'center' }) — that helper sometimes scrolls a
    // different ancestor when the strip is nested inside transitioned
    // wrappers, leaving the active pill clipped off the right edge.
    effect(() => {
      const cur = this.current();
      requestAnimationFrame(() => {
        const btn = this.host.nativeElement.querySelector(
          `[data-testid="stepper-step-${cur}"]`,
        ) as HTMLElement | null;
        const scroller = this.host.nativeElement.querySelector('.stepper') as HTMLElement | null;
        if (!btn || !scroller) return;
        // getBoundingClientRect uses viewport coordinates, so it's not
        // affected by ambiguous offsetParent chains. We measure where the
        // button sits *right now* relative to the scroller, then nudge
        // scrollLeft by exactly the delta needed to centre it.
        const btnRect = btn.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        const currentOffsetInScroller = btnRect.left - scrollerRect.left;
        const desiredOffsetInScroller = (scroller.clientWidth - btn.offsetWidth) / 2;
        const delta = currentOffsetInScroller - desiredOffsetInScroller;
        scroller.scrollTo({
          left: Math.max(0, scroller.scrollLeft + delta),
          behavior: 'smooth',
        });
      });
    });
  }

  private readonly currentIndex = computed(() => {
    const list = this.steps();
    const idx = list.findIndex((s) => s.key === this.current());
    return idx === -1 ? 0 : idx;
  });

  isDone(index: number): boolean {
    return index < this.currentIndex();
  }
}
