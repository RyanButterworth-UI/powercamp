import { Component, inject, input, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { CHURCHES, CHURCH_OTHER } from '../data/churches';
import { ResetRegistrationService } from '../reset-registration.service';
import { SagaSelectComponent, SagaSelectOption } from '../saga-select/saga-select.component';

@Component({
  selector: 'app-t-shirt',
  imports: [ReactiveFormsModule, SagaSelectComponent],
  template: `
    <form [formGroup]="form">
      <div
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <label class="block mb-2 font-medium"
            >T-shirt Size <span class="required-star">*</span></label
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
            <label class="my-2 text-sm block">
              Which church do you attend? <span class="required-star">*</span>
            </label>
            <p class="text-xs mb-2" style="color: var(--color-saga-text-muted)">
              Type to search the list. Not there? Pick <span style="color: var(--color-saga-text-strong); font-weight: 600;">Other (type your own)</span> at the bottom.
            </p>
            <div class="my-2">
              <app-saga-select
                [control]="churchSelect"
                [options]="churchOptions"
                placeholder="Select your church…"
                [enableSearch]="true"
              ></app-saga-select>
            </div>

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
        @if (missingLabels().length > 0) {
          <p class="text-xs mt-3" style="color: var(--color-saga-warning)">
            Still need: {{ missingLabels().join(', ') }}
          </p>
        }
        <div class="flex gap-3 mt-4 items-center flex-wrap">
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
          <button
            type="button"
            (click)="resetSvc.request()"
            class="saga-btn saga-btn-warning"
          >Restart</button>
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
  protected readonly resetSvc = inject(ResetRegistrationService);

  private readonly LABELS: Record<string, string> = {
    tshirt: 'T-shirt size',
    church: 'Church',
  };

  missingLabels(): string[] {
    return this.camperFields
      .filter((f) => !this.form.get(f)?.valid)
      .map((f) => this.LABELS[f] ?? f);
  }

  readonly churches = CHURCHES;
  readonly OTHER = CHURCH_OTHER;
  readonly churchOptions: SagaSelectOption[] = [
    ...CHURCHES.map((c) => ({ value: c, label: c })),
    { value: CHURCH_OTHER, label: 'Other (type your own)' },
  ];
  otherSelected = signal(false);
  // The dropdown is driven by its own FormControl rather than [value] —
  // [value] on a <select> doesn't reliably move the selected option after
  // the user navigates away and back. The control's valueChanges keeps
  // the parent form's `church` field in sync.
  churchSelect = new FormControl<string>('');

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;

    // Sync the dropdown to whatever's already in the form's church field
    // (e.g. a restored draft or a re-entered camper).
    const initial = this.form.get('church')?.value ?? '';
    if (!initial) {
      this.churchSelect.setValue('');
    } else if (CHURCHES.includes(initial)) {
      this.churchSelect.setValue(initial);
    } else {
      this.churchSelect.setValue(CHURCH_OTHER);
      this.otherSelected.set(true);
    }

    this.churchSelect.valueChanges.subscribe((value) => {
      if (value === CHURCH_OTHER) {
        this.otherSelected.set(true);
        // Don't wipe what they had — let the text input edit the existing value.
      } else {
        this.otherSelected.set(false);
        this.form.get('church')?.setValue(value ?? '');
      }
    });
  }

  // Plain method, not computed() — form.get().value isn't a signal, so a
  // computed would only run once at init and never reflect typed input.
  firstName(): string { return this.form.get('firstName')?.value || ''; }

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
