import { Component, computed, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { CHURCHES, CHURCH_OTHER } from '../data/churches';

@Component({
  selector: 'app-t-shirt',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <label class="block mb-2 font-medium"
            >T-shirt Size <span class="text-red-700">*</span></label
          >
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            @for (size of ['small', 'medium', 'large', 'xlarge']; track size) {
              <label
                [attr.aria-label]="size"
                class="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-green-300 has-checked:bg-green-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25 cursor-pointer"
              >
                <input
                  type="radio"
                  formControlName="tshirt"
                  [value]="size"
                  class="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                />
                <span
                  class="text-sm font-medium uppercase group-has-checked:text-green-900"
                  >{{
                    size.charAt(0).toUpperCase() +
                      size.slice(1).replace('xlarge', 'X-Large')
                  }}</span
                >
              </label>
            }
          </div>
          <div>
            <label class="my-2 text-sm">
              As winter wraps us in its quiet beauty, we're reminded how
              important it is to stay connected and warm in fellowship. Please
              share the name of the church you attend below — just like the
              steady glow of a winter hearth, your church community helps keep
              our camp family strong and united through the season!
              <span class="text-red-700">*</span>
            </label>
            <select
              [value]="dropdownValue()"
              (change)="onChurchSelect($any($event.target).value)"
              class="rounded-lg w-full px-3 py-2 my-2"
            >
              <option value="">Select your church…</option>
              @for (c of churches; track c) {
                <option [value]="c">{{ c }}</option>
              }
              <option [value]="OTHER">Other (type your own)</option>
            </select>

            @if (otherSelected()) {
              <input
                formControlName="church"
                placeholder="Type your church name"
                type="text"
                class="w-full rounded-lg px-3 py-2 my-2"
              />
            }
          </div>
        </div>
        <div class="flex gap-6 mt-6">
          <div class="flex gap-6 mt-6">
            <button
              type="button"
              (click)="goToStep.emit(StepKey.ParentInfo)"
              class="saga-btn saga-btn-secondary"
            >
              Back
            </button>
            <button
              [disabled]="!areCamperFieldsValid()"
              type="button"
              (click)="goToStep.emit(StepKey.OtherInfo)"
              class="saga-btn saga-btn-primary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </form>
  `,
  styles: ``,
})
export class TShirtComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  camperFields = ['tshirt', 'church'];

  readonly churches = CHURCHES;
  readonly OTHER = CHURCH_OTHER;
  otherSelected = signal(false);
  // What's currently selected in the dropdown — either a known church, '__other__',
  // or '' (placeholder). Tracks the form's church value when it's a known one.
  dropdownValue = computed(() => {
    if (this.otherSelected()) return this.OTHER;
    const current = this.form.get('church')?.value ?? '';
    return CHURCHES.includes(current) ? current : '';
  });

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
    // If a church is already saved (e.g. from a re-entered camper), prime the
    // "other" toggle so the right input is shown.
    const current = this.form.get('church')?.value ?? '';
    if (current && !CHURCHES.includes(current)) {
      this.otherSelected.set(true);
    }
  }

  onChurchSelect(value: string): void {
    if (value === this.OTHER) {
      this.otherSelected.set(true);
      // Clear so the user types fresh; they can't submit without picking.
      this.form.get('church')?.setValue('');
    } else {
      this.otherSelected.set(false);
      this.form.get('church')?.setValue(value);
    }
  }

  firstName = computed(() => this.form.get('firstName')?.value || '');

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
