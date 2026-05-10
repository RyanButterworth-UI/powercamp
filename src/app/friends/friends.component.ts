import { Component, inject, input, output, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { StepKey } from '../../models';
import { CommonModule } from '@angular/common';
import { ResetRegistrationService } from '../reset-registration.service';

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
          <p class="my-2 text-xs">
            Power Camp memories last a lifetime! Roommate requests aren't
            guaranteed, but we'll do our best. If you have a fellow champion in
            mind, share their name below.
          </p>
          <p class="mb-4 text-xs" style="color: var(--color-saga-text-muted)">
            One name is enough — or skip this step entirely. You can move on whenever you're ready.
          </p>

          <div formArrayName="friends" class="flex flex-col gap-2">
            @for (ctrl of friendsArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  [formControlName]="$index"
                  placeholder="Friend's name"
                  class="rounded-md px-3 py-1.5 w-full text-sm"
                />
                @if (friendsArray.controls.length > 1) {
                  <button
                    type="button"
                    (click)="removeFriend($index)"
                    aria-label="Remove this friend"
                    title="Remove"
                    class="cursor-pointer rounded-md p-1.5"
                    style="background: none; border: 1px solid var(--color-saga-border); color: var(--color-saga-text-muted);"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                }
              </div>
            }
          </div>

          <button
            type="button"
            (click)="addFriend()"
            aria-label="Add another friend"
            title="Add another friend"
            class="mt-3 cursor-pointer rounded-full self-start inline-flex items-center justify-center"
            style="width: 36px; height: 36px; background: var(--color-saga-action-soft); border: 1px solid var(--color-saga-action); color: var(--color-saga-action);"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div class="flex gap-3 mt-6 items-center flex-wrap">
          <button
            type="button"
            (click)="goToStep.emit(StepKey.CamperAdditionalInfo)"
            class="saga-btn saga-btn-secondary"
          >
            Back
          </button>
          <button
            type="button"
            (click)="goToStep.emit(StepKey.Medical)"
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
export class FriendsComponent {
  form!: FormGroup;

  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  StepKey = StepKey;
  protected readonly resetSvc = inject(ResetRegistrationService);

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
