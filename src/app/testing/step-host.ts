import { Component, NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

/**
 * Shared host fixture for the camper-flow step components (CamperInfo,
 * CampAdditionalInfo, Friends, Medical, Parent, Tshirt, OtherInfo,
 * Summary, ConsentStep). Each step injects FormGroupDirective from a
 * parent <form [formGroup]>; in unit tests we wrap them in a tiny host
 * that provides the same form so they can construct cleanly.
 *
 * Use the helper to avoid copy-pasting 30 lines of FormGroup setup
 * across every step's spec:
 *
 *   const { hostFixture, child } = mountStep(CamperInfoComponent);
 *   expect(child).toBeTruthy();
 */
@Component({
  selector: 'step-host',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  // Each mountStep call overrides the template to inject the step
  // component's tag (e.g. <app-camper-info>). The component is provided
  // via TestBed module imports — Angular renders it correctly — but the
  // host's per-component schema check still logs NG0303/NG0304 because
  // the tag isn't in this component's imports. NO_ERRORS_SCHEMA silences
  // those warnings for this test-only host. Production never instantiates it.
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <form [formGroup]="form">
      <ng-content></ng-content>
    </form>
  `,
})
export class StepHostComponent {
  // Mirrors the rootFormGroup defined in FormComponent. Most fields are
  // optional so individual specs can override what they need.
  form: FormGroup;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      camperCell: [''],
      gender: ['', Validators.required],
      email: [''],
      age: ['', Validators.required],
      grade: ['', Validators.required],
      friends: fb.array([new FormControl('')]),
      medical: [''],
      parentName: ['', Validators.required],
      parentPhone: ['', Validators.required],
      parentEmail: ['', Validators.required],
      church: ['', Validators.required],
      tshirt: ['', Validators.required],
      generalInfo: [''],
      dob: ['', Validators.required],
      consent_general: [false, Validators.requiredTrue],
      consent_location: [false, Validators.requiredTrue],
      consent_risk: [false, Validators.requiredTrue],
      consent_powerCamp: [false, Validators.requiredTrue],
      consent_behaviour: [false, Validators.requiredTrue],
      consent_photo: [false, Validators.requiredTrue],
      consent_emergencyName: ['', Validators.required],
      consent_emergencyContact: ['', Validators.required],
      consent_medicalAidName: ['', Validators.required],
      consent_medicalAidNumber: ['', Validators.required],
      consent_date: ['2026-01-01', Validators.required],
    });
  }
}

/**
 * Mounts a step component inside the StepHost so its FormGroupDirective
 * dependency resolves. Returns both the host fixture (for triggering
 * change detection) and the child component instance (for assertions).
 *
 * Pass `inputs` to set required component inputs (eg `formGroupLabel`).
 * `stepVisible` is wired by default since most camper-flow steps need it.
 */
export function mountStep<T>(
  StepCmp: Type<T>,
  inputs: Record<string, string> = {}
): {
  hostFixture: ComponentFixture<StepHostComponent>;
  child: T;
} {
  const tag = selectorFor(StepCmp);
  const inputAttrs = Object.entries({ stepVisible: 'true', ...inputs })
    .map(([k, v]) => `[${k}]="${v}"`)
    .join(' ');

  TestBed.configureTestingModule({
    imports: [StepHostComponent, StepCmp as Type<unknown>],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  }).overrideComponent(StepHostComponent, {
    set: { template: `<form [formGroup]="form"><${tag} ${inputAttrs}></${tag}></form>` },
  });

  const hostFixture = TestBed.createComponent(StepHostComponent);
  hostFixture.detectChanges();
  const childDebugEl = hostFixture.debugElement.children[0]?.children[0];
  const child = childDebugEl?.componentInstance as T;
  return { hostFixture, child };
}

// Pulls the selector off a Component decorator so the host template can
// reference the child by tag without each spec having to spell it out.
function selectorFor(Cmp: Type<unknown>): string {
  // Using `any` here is fine — Angular's Component metadata is stored
  // on a private symbol but has a stable shape across recent versions.
  // The fallback handles components without a selector (theoretical).
  const ann = (Cmp as unknown as { ɵcmp?: { selectors?: string[][] } }).ɵcmp;
  const selector = ann?.selectors?.[0]?.[0];
  return selector ?? 'unknown';
}
