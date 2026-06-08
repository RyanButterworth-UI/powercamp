import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AdminCamper, CamperEditPayload } from '../admin.service';

// Allow an empty camper email, but if one is given it must be a valid address.
// (The camper's own email is optional; the parent email is required + validated
// separately.)
function emailOrEmpty(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').trim();
  if (!v) return null;
  return Validators.email(control);
}

// A slide-over form for editing a single camper's details. Deliberately a
// "controlled" component: it knows how to render + validate the editable fields
// and emits a clean payload, but it does NOT talk to the server or own the
// unlock flow — the dashboard orchestrates that. This keeps it trivial to test
// (camper in → payload out) and keeps all service/auth concerns in one place.
//
// It never renders the six consent agreements or the signed consent date —
// those are immutable and simply absent from the form.
@Component({
  selector: 'app-camper-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (camper(); as c) {
      <div
        class="ce-backdrop"
        data-testid="camper-edit-backdrop"
        (click)="onCancel()"
      ></div>
      <aside
        class="ce-panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Edit ' + c.firstName + ' ' + c.lastName"
        data-testid="camper-edit-panel"
      >
        <header class="ce-header">
          <div>
            <h2 class="text-lg font-semibold" style="margin:0;">
              Edit {{ c.firstName }} {{ c.lastName }}
            </h2>
            <p class="text-xs" style="margin:2px 0 0; color: var(--color-saga-text-muted);">
              {{ c.year }} · Changes email the family what changed and sync the sheet.
            </p>
          </div>
          <button
            type="button"
            class="saga-btn-ghost cursor-pointer"
            (click)="onCancel()"
            aria-label="Close"
            data-testid="camper-edit-close"
          >✕</button>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ce-body">
          <fieldset class="ce-group">
            <legend>Camper</legend>
            <div class="ce-grid">
              <label class="ce-field">
                <span>First name *</span>
                <input type="text" formControlName="firstName" data-testid="ce-firstName" />
                @if (invalid('firstName')) { <em class="ce-err">Required</em> }
              </label>
              <label class="ce-field">
                <span>Last name *</span>
                <input type="text" formControlName="lastName" data-testid="ce-lastName" />
                @if (invalid('lastName')) { <em class="ce-err">Required</em> }
              </label>
              <label class="ce-field">
                <span>Date of birth</span>
                <input type="text" formControlName="dob" placeholder="YYYY-MM-DD" />
              </label>
              <label class="ce-field">
                <span>Gender</span>
                <input type="text" formControlName="gender" />
              </label>
              <label class="ce-field">
                <span>Age</span>
                <input type="text" formControlName="age" />
              </label>
              <label class="ce-field">
                <span>Grade</span>
                <input type="text" formControlName="grade" />
              </label>
              <label class="ce-field">
                <span>Camper email</span>
                <input type="email" formControlName="email" data-testid="ce-email" />
                @if (invalid('email')) { <em class="ce-err">Invalid email</em> }
              </label>
              <label class="ce-field">
                <span>Camper cell</span>
                <input type="text" formControlName="camperCell" />
              </label>
              <label class="ce-field">
                <span>T-shirt size</span>
                <input type="text" formControlName="tshirt" />
              </label>
              <label class="ce-field">
                <span>Church</span>
                <input type="text" formControlName="church" />
              </label>
              <label class="ce-field ce-span-2">
                <span>Friends <em class="ce-hint">(comma-separated)</em></span>
                <input type="text" formControlName="friends" placeholder="Jo, Lee" />
              </label>
              <label class="ce-field ce-span-2">
                <span>Medical / allergies</span>
                <textarea formControlName="medical" rows="2"></textarea>
              </label>
              <label class="ce-field ce-span-2">
                <span>Anything else</span>
                <textarea formControlName="generalInfo" rows="2"></textarea>
              </label>
            </div>
          </fieldset>

          <fieldset class="ce-group">
            <legend>Parent / guardian</legend>
            <div class="ce-grid">
              <label class="ce-field">
                <span>Name</span>
                <input type="text" formControlName="parentName" />
              </label>
              <label class="ce-field">
                <span>Phone</span>
                <input type="text" formControlName="parentPhone" />
              </label>
              <label class="ce-field ce-span-2">
                <span>Email *</span>
                <input type="email" formControlName="parentEmail" data-testid="ce-parentEmail" />
                @if (invalid('parentEmail')) { <em class="ce-err">A valid email is required</em> }
              </label>
            </div>
          </fieldset>

          <fieldset class="ce-group">
            <legend>Emergency &amp; medical aid</legend>
            <div class="ce-grid">
              <label class="ce-field">
                <span>Emergency contact name</span>
                <input type="text" formControlName="consentEmergencyName" />
              </label>
              <label class="ce-field">
                <span>Emergency contact number</span>
                <input type="text" formControlName="consentEmergencyContact" />
              </label>
              <label class="ce-field">
                <span>Medical aid name</span>
                <input type="text" formControlName="consentMedicalAidName" />
              </label>
              <label class="ce-field">
                <span>Medical aid number</span>
                <input type="text" formControlName="consentMedicalAidNumber" />
              </label>
            </div>
            <p class="ce-locked">
              🔒 The consent agreements and signed consent date can’t be edited here.
            </p>
          </fieldset>
        </form>

        <footer class="ce-footer">
          <button
            type="button"
            class="saga-btn saga-btn-ghost cursor-pointer"
            (click)="onCancel()"
            data-testid="camper-edit-cancel"
          >Cancel</button>
          <button
            type="button"
            class="saga-btn saga-btn-primary cursor-pointer"
            [disabled]="saving()"
            (click)="onSubmit()"
            data-testid="camper-edit-save"
          >{{ saving() ? 'Saving…' : 'Save changes' }}</button>
        </footer>
      </aside>
    }
  `,
  styles: [`
    .ce-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50;
    }
    .ce-panel {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 51;
      width: 100%; max-width: 560px;
      background: var(--color-saga-surface, #fff);
      display: flex; flex-direction: column;
      box-shadow: -8px 0 24px rgba(0,0,0,0.2);
      animation: ce-slide-in 160ms ease-out;
    }
    @keyframes ce-slide-in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
    .ce-header, .ce-footer {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 16px 20px; flex: 0 0 auto;
    }
    .ce-header { border-bottom: 1px solid var(--color-saga-border); }
    .ce-footer { border-top: 1px solid var(--color-saga-border); }
    .ce-body { overflow-y: auto; padding: 16px 20px; flex: 1 1 auto; }
    .ce-group { border: none; padding: 0; margin: 0 0 20px; }
    .ce-group legend {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--color-saga-text-muted); margin-bottom: 8px;
    }
    .ce-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ce-span-2 { grid-column: 1 / -1; }
    .ce-field { display: flex; flex-direction: column; gap: 4px; }
    .ce-field > span { font-size: 13px; color: var(--color-saga-text-strong); }
    .ce-hint, .ce-err { font-style: normal; }
    .ce-hint { color: var(--color-saga-text-muted); font-size: 11px; }
    .ce-err { color: var(--color-saga-danger, #dc2626); font-size: 11px; }
    .ce-field input, .ce-field textarea {
      border: 1px solid var(--color-saga-border); border-radius: 8px;
      padding: 8px 10px; font: inherit; width: 100%;
    }
    .ce-locked {
      margin: 10px 0 0; font-size: 12px; color: var(--color-saga-text-muted);
    }
    @media (max-width: 520px) { .ce-grid { grid-template-columns: 1fr; } }
  `],
})
export class CamperEditComponent {
  // Open when non-null; the form repopulates each time it changes.
  readonly camper = input<AdminCamper | null>(null);
  readonly saving = input<boolean>(false);

  readonly submitForm = output<CamperEditPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    parentEmail: ['', [Validators.required, Validators.email]],
    dob: [''],
    gender: [''],
    age: [''],
    grade: [''],
    email: ['', emailOrEmpty],
    camperCell: [''],
    medical: [''],
    tshirt: [''],
    church: [''],
    generalInfo: [''],
    friends: [''],
    parentName: [''],
    parentPhone: [''],
    consentEmergencyName: [''],
    consentEmergencyContact: [''],
    consentMedicalAidName: [''],
    consentMedicalAidNumber: [''],
  });

  constructor() {
    // Repopulate whenever a (different) camper is selected for editing.
    effect(() => {
      const c = this.camper();
      if (!c) return;
      this.form.reset();
      this.form.patchValue({
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        parentEmail: c.parentEmail ?? '',
        dob: c.dob ?? '',
        gender: c.gender ?? '',
        age: c.age ?? '',
        grade: c.grade ?? '',
        email: c.email ?? '',
        camperCell: c.camperCell ?? '',
        medical: c.medical ?? '',
        tshirt: c.tshirt ?? '',
        church: c.church ?? '',
        generalInfo: c.generalInfo ?? '',
        friends: (c.friends ?? []).join(', '),
        parentName: c.parentName ?? '',
        parentPhone: c.parentPhone ?? '',
        consentEmergencyName: c.consentEmergencyName ?? '',
        consentEmergencyContact: c.consentEmergencyContact ?? '',
        consentMedicalAidName: c.consentMedicalAidName ?? '',
        consentMedicalAidNumber: c.consentMedicalAidNumber ?? '',
      });
    });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const t = (s: string | null | undefined): string | undefined => {
      const x = (s ?? '').trim();
      return x ? x : undefined;
    };
    const friends = (v.friends ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: CamperEditPayload = {
      firstName: (v.firstName ?? '').trim(),
      lastName: (v.lastName ?? '').trim(),
      parentEmail: (v.parentEmail ?? '').trim().toLowerCase(),
      dob: t(v.dob),
      gender: t(v.gender),
      age: t(v.age),
      grade: t(v.grade),
      email: t(v.email)?.toLowerCase(),
      camperCell: t(v.camperCell),
      medical: t(v.medical),
      tshirt: t(v.tshirt),
      church: t(v.church),
      generalInfo: t(v.generalInfo),
      friends,
      parentName: t(v.parentName),
      parentPhone: t(v.parentPhone),
      consentEmergencyName: t(v.consentEmergencyName),
      consentEmergencyContact: t(v.consentEmergencyContact),
      consentMedicalAidName: t(v.consentMedicalAidName),
      consentMedicalAidNumber: t(v.consentMedicalAidNumber),
    };
    this.submitForm.emit(payload);
  }
}
