import { Component, input, output, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <form [formGroup]="form">
      <div
        class="customer-wrapper"
        [class.opacity-0]="!stepVisible()"
        [class.opacity-100]="stepVisible()"
      >
        <div class="flex flex-col">
          <label class="my-2 text-md text-gray-500">
            Power Camp memories last a lifetime! Roommate requests aren’t
            guaranteed, but we’ll do our best. If you have a fellow champion in
            mind, share their name below — a supportive teammate can make camp
            even more awesome!
          </label>
          <label class="block text-sm/6 font-medium text-gray-900 mb-6">
            You can skip this section if needed
          </label>

          <div formArrayName="friends" class="flex flex-col gap-4">
            @for (ctrl of friendsArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  [formControlName]="$index"
                  placeholder="Friend's Name"
                  class="border rounded px-3 py-1 w-full"
                />
                <button
                  type="button"
                  (click)="removeFriend($index)"
                  class="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            }
          </div>

          <button
            type="button"
            (click)="addFriend()"
            class="my-4 bg-green-300 text-green-900 px-3 py-1 rounded self-start"
          >
            Add Another Friend
          </button>
        </div>

        <div class="flex gap-6 mt-6">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.CamperAdditionalInfo)"
            class="px-8 py-2 rounded border border-gray-300  text-gray-600 cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Medical)"
            [disabled]="!areCamperFieldsValid"
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
export class FriendsComponent {
  form!: FormGroup;

  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;

  camperFields = ['firstName', 'lastName'];

  constructor(
    private rootFormGroup: FormGroupDirective,
    private fb: FormBuilder
  ) {
    this.form = this.rootFormGroup.control;
  }

  get friendsArray() {
    return this.form.get('friends') as FormArray;
  }

  get areCamperFieldsValid(): boolean {
    return this.camperFields.every((field) => this.form.get(field)?.valid);
  }

  addFriend() {
    this.friendsArray.push(this.fb.control(''));
    this.form.updateValueAndValidity();
  }

  removeFriend(i: number) {
    this.friendsArray.removeAt(i);
  }
}
