import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { ResetRegistrationService } from '../reset-registration.service';

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
        <div class="flex gap-3 mt-6 items-center flex-wrap">
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
export class MedicalComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  camperFields = [];
  protected readonly resetSvc = inject(ResetRegistrationService);

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
