import { Component, computed, output } from '@angular/core';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-summary',
  imports: [NgClass],
  template: `
    <div class="customer-wrapper">
      <h2 class="text-xl font-bold mb-4 text-gray-800">
        Camper & Parent Summary
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Camper Details -->
        <div class="border rounded-lg p-4 shadow bg-white">
          <h3 class="text-lg font-semibold mb-2 text-gray-700">
            Camper Details
          </h3>
          <p><strong>Name:</strong> {{ form.get('camperName')?.value }}</p>
          <p>
            <strong>Age:</strong> {{ form.get('camperAge')?.value || 'N/A' }}
          </p>
          <p><strong>Grade:</strong> {{ form.get('camperGrade')?.value }}</p>
          <p><strong>Age:</strong> {{ form.get('camperAge')?.value }}</p>
        </div>

        <!-- Parent Details -->
        <div class="border rounded-lg p-4 shadow bg-white">
          <h3 class="text-lg font-semibold mb-2 text-gray-700">
            Parent / Guardian Details
          </h3>
          <p><strong>Name:</strong> {{ form.get('parentName')?.value }}</p>
          <p>
            <strong>Medical Aid Name:</strong>
            {{ form.get('medicalAidName')?.value }}
          </p>
          <p>
            <strong>Medical Aid #:</strong>
            {{ form.get('medicalAidNumber')?.value }}
          </p>
          <p>
            <strong>Emergency Contact:</strong>
            {{ form.get('emergencyContact')?.value }}
          </p>
          <p>
            <strong>Completed On:</strong>
            {{ form.get('dateOfCompletion')?.value }}
          </p>
        </div>

        <div class="border rounded-lg p-4 shadow bg-white">
          <h3 class="text-lg font-semibold mb-2 text-gray-700">
            Consent Given
          </h3>
          <p [ngClass]="allConsentsAccepted() ? 'text-green-600' : 'text-red-600'">
            {{ allConsentsAccepted() ? 'All consent Accepted' : 'Consent Missing' }}
          </p>
        </div>
      </div>

      <div class="flex  gap-4 mt-6">
        <button
          class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
          (click)="navigateBack.emit()"
        >
          back
        </button>
        <button
          type="button"
          (click)="triggerSubmission.emit()"
          class="bg-green-300 text-green-900 px-8 py-2 rounded disabled:bg-red-700 cursor-pointer disabled:text-white disabled:cursor-not-allowed"class="mt-2 bg-green-300 w-fit text-green-900 px-8 py-2 rounded disabled:bg-red-700 disabled:text-white disabled:cursor-not-allowed cursor-pointer"
        >
          Confirm & Submit
        </button>
      </div>
    </div>
  `,
  styles: ``,
})
export class SummaryComponent {
  form!: FormGroup;
  triggerSubmission = output<void>();
  navigateBack = output<void>();
  constructor(protected rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }

  allConsentsAccepted = computed(() => {
    const controls = [
      'generalConsent',
      'locationConsent',
      'riskConsent',
      'powerCampConsent',
      'behaviourConsent',
      'photoConsent',
    ];

    return controls.every(
      (controlName) => this.form.get(controlName)?.value === 'accept'
    );
  });
}
