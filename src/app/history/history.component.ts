import { Component } from '@angular/core';

// Public "History" page — where Power Camp came from and who runs it now.
//
// Wilhelm Smalberger's own account of how camp started belongs here. Paste his
// text as one string per paragraph and the "How it started" section renders
// itself; leave it empty and the section stays hidden. Deliberately empty
// rather than filled with invented history — nobody should be quoted saying
// something they didn't write.
const FOUNDER_STORY: string[] = [];

const FOUNDER_NAME = 'Wilhelm Smalberger';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-3xl page-fade-in">
      <h1 class="text-3xl font-bold mb-2">The history of Power Camp</h1>
      <p class="text-sm mb-6" style="color: var(--color-saga-text-muted)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>

      @if (founderStory.length > 0) {
        <section class="saga-card p-5 mb-5" data-testid="founder-story">
          <h2 class="mb-3">How it started</h2>
          @for (paragraph of founderStory; track paragraph) {
            <p class="text-sm mb-3" style="color: var(--color-saga-text)">
              {{ paragraph }}
            </p>
          }
          @if (founderName) {
            <p class="text-sm mt-4" style="color: var(--color-saga-text-muted)">
              — {{ founderName }}, founder of Power Camp
            </p>
          }
        </section>
      }

      <section class="saga-card p-5 mb-5" data-testid="today">
        <h2 class="mb-3">Power Camp today</h2>
        <p class="text-sm mb-3" style="color: var(--color-saga-text)">
          Power Camp is currently organised by Neil Cable.
        </p>
        <p class="text-sm" style="color: var(--color-saga-text-muted)">
          Camp runs each year at YFC Magaliesburg for grades 8 to 12, with a leader
          programme for 18+. It's put on by a volunteer team of leaders, and it runs on
          the generosity of the families and churches behind it.
        </p>
      </section>
    </div>
  `,
  styles: ``,
})
export class HistoryComponent {
  readonly founderStory = FOUNDER_STORY;
  readonly founderName = FOUNDER_NAME;
}
