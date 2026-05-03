import { Component, input, output } from '@angular/core';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { StepKey } from '../../models';

@Component({
  selector: 'app-summary',
  imports: [],
  template: `
    <div class="customer-wrapper">
      <h2 class="text-xl font-bold mb-4 text-[color:var(--color-saga-text-strong)]">
        Camper & Parent Summary
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Camper Details -->
        <div class="border rounded-lg p-4 shadow bg-white">
          <h3 class="text-lg font-semibold mb-2 text-[color:var(--color-saga-text)]">
            Camper Details
          </h3>
          <p>
            <strong>Name:</strong> {{ form.get('firstName')?.value }}
            {{ form.get('lastName')?.value }}
          </p>
          <p>
            <strong>Cell:</strong> {{ form.get('camperCell')?.value || 'N/A' }}
          </p>
          <p><strong>Email:</strong> {{ form.get('email')?.value || 'N/A' }}</p>
          <p><strong>Gender:</strong> {{ form.get('gender')?.value }}</p>
          <p><strong>Age:</strong> {{ form.get('age')?.value }}</p>
          <p><strong>Grade:</strong> {{ form.get('grade')?.value }}</p>
          <p><strong>Date of Birth:</strong> {{ form.get('dob')?.value }}</p>
          <p><strong>Church:</strong> {{ form.get('church')?.value }}</p>
          <p><strong>T-shirt Size:</strong> {{ form.get('tshirt')?.value }}</p>
          <p>
            <strong>Medical Info:</strong>
            {{ form.get('medical')?.value || 'None' }}
          </p>
          <div>
            <strong>Friends:</strong>
            <ul class="list-disc ml-5">
              @for (friend of form.get('friends')?.value; track $index) {
                <li>{{ friend }}</li>
              }
            </ul>
          </div>
          <p>
            <strong>General Info:</strong>
            {{ form.get('generalInfo')?.value || 'N/A' }}
          </p>
        </div>

        <!-- Parent Details -->
        <div class="border rounded-lg p-4 shadow bg-white">
          <h3 class="text-lg font-semibold mb-2 text-[color:var(--color-saga-text)]">
            Parent / Guardian Details
          </h3>
          <p><strong>Name:</strong> {{ form.get('parentName')?.value }}</p>
          <p><strong>Phone:</strong> {{ form.get('parentPhone')?.value }}</p>
          <p><strong>Email:</strong> {{ form.get('parentEmail')?.value }}</p>
        </div>
      </div>

      <div class="flex  gap-4 mt-6">
        <button
          type="button"
          (click)="goToStep.emit(StepKey.Tshirt)"
          class="saga-btn saga-btn-secondary"
        >
          Back
        </button>
        <button
          type="button"
          (click)="triggerSubmission.emit()"
          class="saga-btn saga-btn-primary"
        >
          Confirm
        </button>
      </div>
    </div>
  `,
  styles: ``,
})
export class SummaryComponent {
  form!: FormGroup;
  stepVisible = input.required<boolean>();
  goToStep = output<StepKey>();
  triggerSubmission = output();
  StepKey = StepKey;
  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }
}
