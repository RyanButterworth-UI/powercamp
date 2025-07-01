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
          <label class="my-2 text-sm text-gray-500">
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
            class="px-8 py-2 rounded border"
          >
            Back
          </button>
          <button
            [disabled]="!areCamperFieldsValid()"
            type="button"
            (click)="goToStep.emit(StepKey.CheckData)"
            class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
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
  grades = signal(['8', '9', '10', '11', '12']);
  ageOptions = signal([14, 15, 16, 17, 18]);
  camperFields = ['firstName', 'lastName'];

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  firstName = computed(() => this.form.get('firstName')?.value || '');

  areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }
}
