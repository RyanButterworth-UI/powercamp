import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackComponent } from '../feedback/feedback.component';

// The public landing page whenever registrations are closed — which, right
// after camp, is the page every visitor lands on. So it does the post-camp job:
// thank people, show the highlights reel, collect feedback inline, and point at
// next year.
//
// It still owns the waiting-list entry point (the parent switches the full
// registration form into waitlist mode on (join)), reworded as "get on the 2027
// list" so an interested family can raise their hand all year instead of
// bouncing off a dead end.
//
// NOTE: this screen also shows if an admin closes registrations mid-season
// because camp filled up. In that state the post-camp copy below reads wrong —
// revisit it when 2027 registration opens and capacity becomes the reason we're
// closed again.
@Component({
  selector: 'app-registration-closed',
  standalone: true,
  imports: [CommonModule, FeedbackComponent],
  template: `
    <div class="customer-wrapper" data-testid="registration-closed">
      <h1 class="text-3xl font-bold mb-1">Power Camp 2026</h1>
      <p class="mb-3 text-sm" style="color: var(--color-saga-text-muted)">
        Purity · Obedience · Worship · Endurance · Righteousness
      </p>
      <p class="text-md mb-5" style="color: var(--color-saga-text-muted)">
        That's a wrap on Power Camp 2026 — three days at YFC Magaliesburg. Thank you to
        every camper, parent and leader who made it what it was.
      </p>

      <!-- Highlights reel. 16:9 via the padding-top trick so it scales with the
           column instead of needing a fixed height. -->
      <div
        class="mb-5 rounded-lg overflow-hidden"
        style="border: 1px solid var(--color-saga-border);"
        data-testid="highlights-video"
      >
        <div style="position: relative; width: 100%; padding-top: 56.25%;">
          <iframe
            src="https://www.youtube.com/embed/80OJqIUfw_U"
            title="Power Camp 2026 highlights"
            style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>
      </div>

      <!-- Feedback is the one thing we want from a visitor right now, so the
           form is embedded rather than hidden behind a link. /feedback still
           works standalone for anyone we send straight there. -->
      <div class="saga-card p-4 mb-5" data-testid="feedback-embed">
        <h2 class="mb-1">Were you at camp? Tell us how it went.</h2>
        <p class="text-sm mb-4" style="color: var(--color-saga-text-muted)">
          Two minutes, one response per camper — it's what we plan next year off.
        </p>
        <app-feedback [embedded]="true"></app-feedback>
      </div>

      <p class="mb-5 text-sm" style="color: var(--color-saga-text)">
        <strong>New this year:</strong> Power Camp has moved to an app experience —
        registration, consent, the kit list and feedback all live in one place. Install it
        on your phone from your browser's <em>Share</em> menu with
        <em>Add to Home Screen</em>.
      </p>

      <div class="saga-card p-4 mb-4" data-testid="next-year">
        <h2 class="mb-1">Power Camp 2027</h2>
        <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
          We don't have dates yet — we'll email everyone as soon as they're locked in.
          Registrations are closed until then.
        </p>
        <p class="text-sm mb-4" style="color: var(--color-saga-text)">
          Want in for 2027? Get on the list and we'll come to you first. You can complete
          the whole registration now, consent and all, and we'll hold it on file.
        </p>
        <button
          type="button"
          (click)="join.emit()"
          class="saga-btn saga-btn-primary"
          data-testid="waitlist-start"
        >
          Get on the 2027 list
        </button>
        <div class="mt-4 text-sm" style="color: var(--color-saga-text-muted)">
          Prefer email? Write to
          <a
            [href]="mailtoHref()"
            class="font-semibold"
            style="color: var(--color-saga-primary)"
            data-testid="waitlist-mailto"
            >{{ waitlistEmail() }}</a
          >
          and ask to be added.
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class RegistrationClosedComponent {
  // The camp's public mailbox families are pointed at. Provided by the parent
  // (read from /registration-status) so it stays configurable.
  waitlistEmail = input<string>('powercamplife@gmail.com');
  // Emitted when the family chooses to join the list — the parent
  // (FormComponent) switches the full registration form into waitlist mode.
  join = output<void>();

  mailtoHref = computed(
    () =>
      `mailto:${this.waitlistEmail()}?subject=${encodeURIComponent('Power Camp 2027 list')}`
  );
}
