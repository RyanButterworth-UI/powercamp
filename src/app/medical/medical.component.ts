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
        class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div>
          <p class="text-red-800">Medical Information:</p>
          <p class="block text-sm/4 font-medium text-gray-500">
            We want to be prepared. Please give any important medical info.
          </p>
          <label class="block text-xs/6 font-medium text-gray-900 my-2">
            You can skip this section if you are fighting fit.
            <span class="text-red-700">*</span>
          </label>
          <textarea
            formControlName="medical"
            placeholder="Please provide any medical information that we should be aware of, such as allergies, medications, or other health concerns."
            name="medical"
            rows="3"
            class="w-full border rounded px-3 py-2 mb-4 text-sm"
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
            (click)="goToStep.emit(StepKey.ParentInfo)"
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
