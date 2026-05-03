import { Component, computed, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';

@Component({
  selector: 'app-other-info',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <label class="my-2 text-sm">
            Before you cross the finish line, is there anything else we should
            know? We want to make sure you have everything you need for an
            amazing camp experience this winter! (You can skip this too!)
          </label>
          <textarea
            formControlName="generalInfo"
            placeholder="Share any additional information or special requests you have for us. This could include dietary restrictions,or anything else that will help us support you during camp."
            name="generalInfo"
            rows="3"
            class="w-full border rounded px-3 py-2 my-4 text-sm"
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
            type="button"
            (click)="goToStep.emit(StepKey.CheckData)"
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
export class OtherInfoComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  camperFields = ['firstName', 'lastName'];

  constructor(private readonly rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  firstName = computed(() => this.form.get('firstName')?.value || '');

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
