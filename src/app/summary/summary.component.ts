import { Component, inject, input, output } from '@angular/core';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { StepKey } from '../../models';
import { ResetRegistrationService } from '../reset-registration.service';

@Component({
  selector: 'app-summary',
  imports: [],
  template: `
    <div class="customer-wrapper">
      <h2 class="text-xl font-bold mb-4" style="color: var(--color-saga-text-strong)">
        Camper & Parent Summary
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="saga-card p-4">
          <h3 class="summary-heading">Camper Details</h3>
          <dl class="summary-list">
            <dt>Name</dt>
            <dd>{{ form.get('firstName')?.value }} {{ form.get('lastName')?.value }}</dd>
            <dt>Cell</dt>
            <dd>{{ form.get('camperCell')?.value || 'N/A' }}</dd>
            <dt>Email</dt>
            <dd class="break-all">{{ form.get('email')?.value || 'N/A' }}</dd>
            <dt>Gender</dt>
            <dd>{{ form.get('gender')?.value || 'N/A' }}</dd>
            <dt>Age</dt>
            <dd>{{ form.get('age')?.value || 'N/A' }}</dd>
            <dt>Grade</dt>
            <dd>{{ form.get('grade')?.value || 'N/A' }}</dd>
            <dt>DOB</dt>
            <dd>{{ form.get('dob')?.value || 'N/A' }}</dd>
            <dt>Church</dt>
            <dd>{{ form.get('church')?.value || 'N/A' }}</dd>
            <dt>T-shirt</dt>
            <dd>{{ form.get('tshirt')?.value || 'N/A' }}</dd>
            <dt>Medical</dt>
            <dd>{{ form.get('medical')?.value || 'None' }}</dd>
            <dt>Friends</dt>
            <dd>
              @if (friends().length > 0) {
                <ul class="list-disc ml-4 space-y-0.5">
                  @for (friend of friends(); track $index) {
                    <li>{{ friend }}</li>
                  }
                </ul>
              } @else {
                <span style="color: var(--color-saga-text-muted)">None</span>
              }
            </dd>
            <dt>Notes</dt>
            <dd>{{ form.get('generalInfo')?.value || 'N/A' }}</dd>
          </dl>
        </div>

        <div class="saga-card p-4">
          <h3 class="summary-heading">Parent / Guardian</h3>
          <dl class="summary-list">
            <dt>Name</dt>
            <dd>{{ form.get('parentName')?.value || 'N/A' }}</dd>
            <dt>Phone</dt>
            <dd>{{ form.get('parentPhone')?.value || 'N/A' }}</dd>
            <dt>Email</dt>
            <dd class="break-all">{{ form.get('parentEmail')?.value || 'N/A' }}</dd>
          </dl>
        </div>
      </div>

      <div class="flex gap-3 mt-6 items-center flex-wrap">
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
        <button
          type="button"
          (click)="resetSvc.request()"
          class="saga-btn saga-btn-warning"
        >Restart</button>
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
  protected readonly resetSvc = inject(ResetRegistrationService);

  // Plain method (not computed): the underlying FormArray's value isn't a
  // signal, so a computed wouldn't re-evaluate as the user types. Angular CD
  // re-runs this on every form input.
  friends(): string[] {
    const raw = this.form.get('friends')?.value as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => String(s ?? '').trim()).filter((s) => s.length > 0);
  }

  constructor(private rootFormGroup: FormGroupDirective) {
    this.form = this.rootFormGroup.control;
  }
}
