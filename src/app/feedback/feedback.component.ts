import { Component, inject, input, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { PageGhostComponent } from '../skeleton/page-ghost.component';
import {
  FormStepperComponent,
  StepperStep,
} from '../form-stepper/form-stepper.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

// The four scored questions. Driving them off one list keeps the markup to a
// single loop instead of four near-identical blocks.
const SCALES = [
  {
    control: 'campOrganization',
    label: 'Organisation of camp',
    hint: 'Did camp run well?',
  },
  {
    control: 'spiritualInput',
    label: 'Spiritual input',
    hint: 'How did you find the speaker and devotions?',
  },
  {
    control: 'activities',
    label: 'Activities',
    hint: 'Did you have the best time ever?',
  },
  {
    control: 'facilities',
    label: 'Meals / campsite',
    hint: "This applies to YFC's facilities",
  },
] as const;

@Component({
  selector: 'app-feedback',
  imports: [
    ReactiveFormsModule,
    SuccessDialogComponent,
    PageGhostComponent,
    FormStepperComponent,
  ],
  template: `
    @if (!ready()) {
      <app-page-ghost [height]="embedded() ? '20vh' : '60vh'" />
    } @else {
      <!-- Standalone at /feedback this owns the page; embedded in the landing
           page it drops the full-height centring shell and just flows inline. -->
      <div
        [class]="
          embedded()
            ? 'w-full'
            : 'container mx-auto my-0 min-h-[calc(100dvh-var(--site-nav-h))] font-inter flex lg:justify-center lg:items-center page-fade-in'
        "
      >
        <div [class]="embedded() ? 'w-full' : 'w-full lg:w-1/2 h-full flex flex-col'">
          <div class="w-full mx-auto h-full flex flex-col">
            @if (showDialog()) {
              <app-success-dialog
                [camperName]="submittedCamperName()"
                [status]="submissionStatus()"
                [feedback]="true"
                [consent]="false"
                [errorTitle]="errorTitle()"
                [errorMessage]="errorMessage()"
                [errorDismissLabel]="errorDismissLabel()"
                (refreshApp)="refreshApp()"
              ></app-success-dialog>
            } @else {
              @if (isSubmitting()) {
                <div
                  class="fixed inset-0 z-50 flex items-center justify-center"
                  style="background-color: rgba(17, 18, 23, 0.8)"
                >
                  <div
                    class="animate-spin rounded-full h-16 w-16"
                    style="border: 3px solid var(--color-saga-border); border-top-color: var(--color-saga-action);"
                  ></div>
                </div>
              }

              <app-form-stepper
                [steps]="steps()"
                [current]="currentStep()"
                (stepClick)="onStepperJump($event)"
              ></app-form-stepper>

              <form [formGroup]="feedback" (ngSubmit)="onSubmit()">
                <div class="customer-wrapper">
                  @if (currentStep() === 0) {
                    <div>
                      <div class="saga-card p-5 mb-4">
                        <img
                          src="./assets/Pc2025.png"
                          alt=""
                          class="w-40 mx-auto mb-5"
                        />
                        <h2 class="mb-3">Thanks for coming to {{ campLabel() }}</h2>
                        <p class="text-sm mb-3">
                          Tell us how it went. We read every one of these and it's
                          what we plan next year's camp off.
                        </p>
                        <p
                          class="text-xs mb-3"
                          style="color: var(--color-saga-text-muted)"
                        >
                          It takes about two minutes, and it's one response per
                          camper — so give us everything you've got.
                        </p>
                        @for (notice of seasonNotices; track notice) {
                          <p
                            class="text-xs mb-2"
                            style="color: var(--color-saga-text-muted)"
                          >
                            {{ notice }}
                          </p>
                        }
                      </div>
                      <div class="flex gap-3 mt-6 items-center flex-wrap">
                        <button
                          type="button"
                          (click)="nextStep()"
                          class="saga-btn saga-btn-primary"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  }

                  @if (currentStep() === 1) {
                    <div>
                      <div>
                        <label class="block mb-1 font-medium">
                          Camper's full name <span class="required-star">*</span>
                        </label>
                        <p
                          class="text-xs mb-2"
                          style="color: var(--color-saga-text-muted)"
                        >
                          The name they registered under, so we can match this to
                          their record.
                        </p>
                        <input
                          formControlName="camperName"
                          placeholder="e.g. John Calvin"
                          name="camperName"
                          class="w-full rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <p
                        class="text-xs mt-5 mb-1"
                        style="color: var(--color-saga-text-muted)"
                      >
                        Rate each one from 0 (needs work) to 5 (couldn't be
                        better).
                      </p>

                      @for (scale of scales; track scale.control) {
                        <div class="mt-4">
                          <label class="block mb-1 font-medium">
                            {{ scale.label }} <span class="required-star">*</span>
                          </label>
                          <p
                            class="text-xs mb-2"
                            style="color: var(--color-saga-text-muted)"
                          >
                            {{ scale.hint }}
                          </p>
                          <div class="grid grid-cols-6 gap-2">
                            @for (value of ratings; track value) {
                              <label
                                [attr.aria-label]="scale.label + ' ' + value"
                                class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  [formControlName]="scale.control"
                                  [value]="value"
                                  class="absolute inset-0 appearance-none focus:outline-none"
                                />
                                <span
                                  class="text-sm font-medium group-has-checked:text-green-900"
                                  >{{ value }}</span
                                >
                              </label>
                            }
                          </div>
                        </div>
                      }

                      @if (missingLabels().length > 0) {
                        <p
                          class="text-xs mt-4"
                          style="color: var(--color-saga-warning)"
                        >
                          Still need: {{ missingLabels().join(', ') }}
                        </p>
                      }

                      <div class="flex gap-3 mt-6 items-center flex-wrap">
                        @if (canGoBack()) {
                          <button
                            type="button"
                            (click)="previousStep()"
                            class="saga-btn saga-btn-secondary"
                          >
                            Back
                          </button>
                        }
                        <button
                          type="button"
                          [disabled]="!ratingsComplete()"
                          (click)="nextStep()"
                          class="saga-btn saga-btn-primary"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  }

                  @if (currentStep() === 2) {
                    <div>
                      <div>
                        <label class="block mb-1 font-medium">
                          Your highlight of this year's camp
                          <span
                            class="text-xs"
                            style="color: var(--color-saga-text-muted)"
                            >(optional)</span
                          >
                        </label>
                        <textarea
                          formControlName="userComment"
                          rows="4"
                          placeholder="The bit you'll still be talking about in a month."
                          class="w-full rounded-lg px-3 py-2 text-sm"
                        ></textarea>
                      </div>

                      <div class="mt-4">
                        <label class="block mb-1 font-medium">
                          {{ campLabel() }} in one word
                          <span
                            class="text-xs"
                            style="color: var(--color-saga-text-muted)"
                            >(optional)</span
                          >
                        </label>
                        <input
                          type="text"
                          formControlName="oneWord"
                          placeholder="SuperIncredibleAmazingAwesomeness"
                          class="w-full rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div class="mt-4">
                        <label class="block mb-2 font-medium">
                          Would you like any follow-up after camp?
                        </label>
                        <div class="grid grid-cols-2 gap-3">
                          @for (option of ['Yes', 'No']; track option) {
                            <label
                              [attr.aria-label]="option"
                              class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 cursor-pointer"
                            >
                              <input
                                type="radio"
                                formControlName="requiresFeedback"
                                [value]="option"
                                class="absolute inset-0 appearance-none focus:outline-none"
                              />
                              <span
                                class="text-sm font-medium group-has-checked:text-green-900"
                                >{{ option }}</span
                              >
                            </label>
                          }
                        </div>
                      </div>

                      <div class="mt-4">
                        <label class="block mb-1 font-medium">
                          Anything else you'd like to tell us?
                          <span
                            class="text-xs"
                            style="color: var(--color-saga-text-muted)"
                            >(optional)</span
                          >
                        </label>
                        <textarea
                          formControlName="additionalInfo"
                          rows="4"
                          class="w-full rounded-lg px-3 py-2 text-sm"
                        ></textarea>
                      </div>

                      <div class="flex gap-3 mt-6 items-center flex-wrap">
                        <button
                          type="button"
                          (click)="previousStep()"
                          class="saga-btn saga-btn-secondary"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          [disabled]="!ratingsComplete()"
                          class="saga-btn saga-btn-primary"
                        >
                          Submit feedback
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: ``,
})
export class FeedbackComponent implements OnInit {
  fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly scales = SCALES;
  readonly ratings = ['0', '1', '2', '3', '4', '5'];

  // Set by the landing page, which renders this form inline. Drops the
  // full-height page shell so the form sits in the flow of the page around it.
  embedded = input<boolean>(false);

  feedback!: FormGroup;
  currentStep = signal<number>(0);
  showDialog = signal(false);
  submittedCamperName = signal('Dear Camper');
  submissionStatus = signal<'success' | 'error'>('success');
  isSubmitting = signal(false);
  ready = signal(false);
  campYear = signal<number | null>(null);
  steps = signal<StepperStep[]>([]);

  // Populated for the 409 "one response per camper" case so the dialog says
  // what actually happened instead of offering a retry that can't work.
  errorTitle = signal('');
  errorMessage = signal('');
  errorDismissLabel = signal('');

  // Year-specific notices on the intro step. These are the ONLY dated
  // sentences on the page — everything else derives from campYear — so a new
  // season means editing this array and nothing else.
  readonly seasonNotices: string[] = [
    'New this year: Power Camp has moved to an app experience — registration, consent, the kit list and this feedback form all live in one place.',
    "We don't have dates for Power Camp 2027 yet. We'll email everyone as soon as they're locked in.",
  ];

  campLabel(): string {
    const year = this.campYear();
    return year ? `Power Camp ${year}` : 'Power Camp';
  }

  // Embedded in the landing page, the welcome step is redundant — the page
  // around it already does that job — so the flow starts at the ratings.
  private minStep(): number {
    return this.embedded() ? 1 : 0;
  }

  // Embedded, the ratings step IS the first step — there's nothing behind it,
  // so "Back" would be a dead control.
  canGoBack(): boolean {
    return this.currentStep() > this.minStep();
  }

  nextStep() {
    this.currentStep.set(Math.min(2, this.currentStep() + 1));
  }

  previousStep() {
    // Clamped: "back" on the first step used to drop currentStep to -1, which
    // matches no @if branch and blanks the form out.
    this.currentStep.set(Math.max(this.minStep(), this.currentStep() - 1));
  }

  // The stepper only lets you jump to a step it hasn't locked.
  onStepperJump(key: number): void {
    if (key === 2 && !this.ratingsComplete()) return;
    this.currentStep.set(Math.max(this.minStep(), key));
  }

  required = [
    'camperName',
    'campOrganization',
    'spiritualInput',
    'activities',
    'facilities',
  ];

  areFieldsValid(fields: string[]): boolean {
    return fields.every((field) => this.feedback?.get(field)?.valid);
  }

  ratingsComplete(): boolean {
    return this.areFieldsValid(this.required);
  }

  // Named list of what's still blank, so "Continue" being greyed out is never
  // a mystery. Mirrors the registration form's own "Still need:" hint.
  missingLabels(): string[] {
    if (!this.feedback) return [];
    const labels: string[] = [];
    if (!this.feedback.get('camperName')?.valid) labels.push("camper's name");
    for (const scale of SCALES) {
      if (!this.feedback.get(scale.control)?.valid) labels.push(scale.label);
    }
    return labels;
  }

  private syncSteps(): void {
    const all: StepperStep[] = [
      { key: 0, label: 'Welcome' },
      { key: 1, label: 'Ratings' },
      { key: 2, label: 'Comments', locked: !this.ratingsComplete() },
    ];
    this.steps.set(all.filter((s) => s.key >= this.minStep()));
  }

  ngOnInit() {
    setTimeout(() => this.ready.set(true), 300);

    // The camp year drives the copy, so a new season needs no code change.
    // Best-effort: if it doesn't load, the copy falls back to "Power Camp".
    this.http
      .get<{ campYear: number }>(`${environment.baseApi}/public-config`)
      .subscribe({
        next: (cfg) => this.campYear.set(cfg.campYear),
        error: () => this.campYear.set(null),
      });

    this.feedback = this.fb.group({
      camperName: ['', Validators.required],
      campOrganization: ['', Validators.required],
      spiritualInput: ['', Validators.required],
      activities: ['', Validators.required],
      facilities: ['', Validators.required],
      userComment: [''],
      oneWord: [''],
      requiresFeedback: ['No'],
      additionalInfo: [''],
    });

    this.currentStep.set(this.minStep());
    this.syncSteps();
    // Keeps the stepper's locked state in step with what's been filled in.
    this.feedback.valueChanges.subscribe(() => this.syncSteps());
  }

  onSubmit() {
    this.isSubmitting.set(true);
    const url = `${environment.baseApi}/feedback`;
    const feedback = this.feedback.value;
    const name = String(feedback.camperName ?? '').trim();
    this.submittedCamperName.set(name);
    this.errorTitle.set('');
    this.errorMessage.set('');
    this.errorDismissLabel.set('');

    this.http.post(url, feedback).subscribe({
      next: () => {
        this.submissionStatus.set('success');
        this.showDialog.set(true);
        this.isSubmitting.set(false);
      },
      error: (err: any) => {
        // 409 = this camper already sent feedback. Not a failure to retry —
        // it's the once-per-camper rule doing its job, so say so plainly and
        // swap the retry button for a dismiss.
        if (err?.status === 409) {
          this.errorTitle.set("You've already sent this");
          this.errorMessage.set(
            `We already have feedback for ${name}. It's one response per camper — ` +
              `thank you, we've got it. If you think this is a mix-up (two campers with ` +
              `the same name, say), give us a shout and we'll sort it out.`
          );
          this.errorDismissLabel.set("We're done");
        } else {
          console.error('Error:', err);
        }
        this.submissionStatus.set('error');
        this.showDialog.set(true);
        this.isSubmitting.set(false); // stop loader
      },
    });
  }

  refreshApp() {
    window.location.reload();
    this.showDialog.set(false);
  }
}
