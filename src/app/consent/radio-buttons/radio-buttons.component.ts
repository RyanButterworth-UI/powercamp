import { Component, input } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-radio-buttons',
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <div [formGroup]="form">
      <fieldset>
        <div class="flex gap-6 ">
          <!-- Accept -->
          <div class="flex items-center">
            <input
              id="accept"
              type="radio"
              [formControlName]="formGroupLabel()"
              value="accept"
              class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-green-600 checked:bg-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
            />
            <label
              for="accept"
              class="ml-3 block text-sm/6 font-medium text-gray-900"
            >
              Accept consent
            </label>
          </div>

          <!-- Reject -->
          <div class="flex items-center">
            <input
              id="reject"
              type="radio"
              value="reject"
              [formControlName]="formGroupLabel()"
              class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-red-600 checked:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
            />
            <label
              for="reject"
              class="ml-3 block text-sm/6 font-medium text-gray-900"
            >
              Reject consent
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  `,
  styles: ``,
})
export class RadioButtonsComponent {
  form!: FormGroup;
  formGroupLabel = input.required<string>();

  constructor(protected rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }
}
