import { Component, input } from '@angular/core';
import { RadioButtonsComponent } from '../radio-buttons/radio-buttons.component';

@Component({
  selector: 'app-base',
  imports: [RadioButtonsComponent],
  template: `
    <div class="border-2 border-gray-200 rounded-md p-4 my-2">
      <p class="">
        {{ consentText() }}
      </p>
      <div class="py-4">
        <app-radio-buttons
          [formGroupLabel]="formControlNameLabel()">
        </app-radio-buttons>
      </div>
    </div>
  `,
  styles: ``,
})
export class BaseComponent {
  consentText = input.required<string>();
  formControlNameLabel = input.required<string>();
}
