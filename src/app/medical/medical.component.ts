import { Component, computed, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';

@Component({
  selector: 'app-medical',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <h2 class="text-lg font-semibold mb-1">Medical info</h2>
          <p class="text-sm mb-3" style="color: var(--color-saga-text-muted)">
            Anything we should know about? Allergies, medication, conditions —
            our nurses like the heads-up. Skip if you're fighting fit.
          </p>
          <textarea
            formControlName="medical"
            placeholder="e.g. Asthma — uses pump. Allergic to peanuts."
            name="medical"
            rows="3"
            class="w-full rounded-lg px-3 py-2 mb-2 text-sm"
          ></textarea>
        </div>
        <div class="flex gap-6 mt-6">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Friends)"
            class="saga-btn saga-btn-secondary"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.ParentInfo)"
            class="saga-btn saga-btn-primary"
          >
            Next
          </button>
        </div>
      </div>
    </form>
  `,
  styles: ``,
})
export class MedicalComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  camperFields = [];

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
