import { Component, computed, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';

@Component({
  selector: 'app-t-shirt',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div
        class="p-5 inset-0 flex flex-col justify-between transition-all duration-700 ease-in-out w-full h-full"
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
            <label class="my-2 text-sm text-gray-500">
              As winter wraps us in its quiet beauty, we’re reminded how
              important it is to stay connected and warm in fellowship. Please
              share the name of the church you attend below — just like the
              steady glow of a winter hearth, your church community helps keep
              our camp family strong and united through the season! </label
            ><span class="text-red-700">*</span>
            <input
              formControlName="church"
              type="text"
              name="generalInfo"
              rows="3"
              class="w-full border rounded px-3 py-2 my-4"
            />
          </div>
        </div>
        <div class="flex gap-6 mt-6">
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
              (click)="goToStep.emit(StepKey.OtherInfo)"
              class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed"
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
