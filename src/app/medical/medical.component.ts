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
          <label class="block mb-2 font-medium">Any Medical Issues?</label>
          <p class="my-2 text-md text-gray-500">
            We want to be prepared. Please give any important medical info.
          </p>
          <label class="block text-sm/6 font-medium text-gray-900 mb-6">
            You can skip this section if you are fighting fit.
            <span class="text-red-700">*</span>
          </label>
          <textarea
            formControlName="medical"
            placeholder="Please provide any medical information that we should be aware of, such as allergies, medications, or other health concerns."
            name="medical"
            rows="3"
            class="w-full border rounded px-3 py-2 mb-4"
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
