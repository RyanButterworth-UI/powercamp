import { Component, input } from '@angular/core';

/**
 * Tiny shimmer placeholder. Use it inline anywhere a value is loading
 * over the network so the layout doesn't pop in / collapse / flash a
 * spinner.
 *
 *   <app-skeleton width="60%" />              line, default 14px tall
 *   <app-skeleton shape="block" height="120px" />  card / image stand-in
 *   <app-skeleton shape="circle" width="36px" height="36px" />  avatar
 *
 * Animation lives in src/styles.css (.skeleton + @keyframes
 * skeleton-shimmer) so the same look applies if anyone hand-rolls the
 * class on a div without going through this component.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <span
      class="skeleton"
      [class.skeleton-circle]="shape() === 'circle'"
      [class.skeleton-block]="shape() === 'block'"
      [style.width]="width()"
      [style.height]="height()"
      role="presentation"
      aria-hidden="true"
    ></span>
  `,
})
export class SkeletonComponent {
  shape = input<'line' | 'block' | 'circle'>('line');
  width = input<string>('100%');
  height = input<string>('14px');
}
