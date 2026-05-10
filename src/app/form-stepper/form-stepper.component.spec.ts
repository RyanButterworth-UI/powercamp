import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormStepperComponent, StepperStep } from './form-stepper.component';

describe('FormStepperComponent', () => {
  let fixture: ComponentFixture<FormStepperComponent>;
  let component: FormStepperComponent;

  const steps: StepperStep[] = [
    { key: 3, label: 'Camper' },
    { key: 4, label: 'Details' },
    { key: 5, label: 'Friends' },
    { key: 6, label: 'Medical' },
    { key: 7, label: 'Parent' },
    { key: 8, label: 'T-shirt' },
    { key: 10, label: 'Other' },
    { key: 11, label: 'Review' },
    { key: 14, label: 'Consent' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormStepperComponent] }).compileComponents();
    fixture = TestBed.createComponent(FormStepperComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('current', 5);
    fixture.detectChanges();
  });

  it('renders one button per step', () => {
    const btns = fixture.nativeElement.querySelectorAll('[data-testid^="stepper-step-"]');
    expect(btns.length).toBe(steps.length);
  });

  it('marks the current step with .is-current', () => {
    const friends = fixture.nativeElement.querySelector(
      '[data-testid="stepper-step-5"]'
    ) as HTMLElement;
    expect(friends.classList.contains('is-current')).toBe(true);

    const camper = fixture.nativeElement.querySelector(
      '[data-testid="stepper-step-3"]'
    ) as HTMLElement;
    expect(camper.classList.contains('is-current')).toBe(false);
  });

  it('marks earlier steps .is-done so they read as completed', () => {
    const camper = fixture.nativeElement.querySelector(
      '[data-testid="stepper-step-3"]'
    ) as HTMLElement;
    expect(camper.classList.contains('is-done')).toBe(true);

    const consent = fixture.nativeElement.querySelector(
      '[data-testid="stepper-step-14"]'
    ) as HTMLElement;
    expect(consent.classList.contains('is-done')).toBe(false);
  });

  it('emits stepClick with the step key when a step is clicked', () => {
    const emitted: number[] = [];
    component.stepClick.subscribe((k) => emitted.push(k));

    (fixture.nativeElement.querySelector('[data-testid="stepper-step-7"]') as HTMLElement).click();
    expect(emitted).toEqual([7]);
  });

  it('locks steps marked as locked and refuses to emit on click', () => {
    fixture.componentRef.setInput('steps', [
      { key: 3, label: 'Camper' },
      { key: 4, label: 'Details' },
      { key: 5, label: 'Friends', locked: true },
      { key: 6, label: 'Medical', locked: true },
    ]);
    fixture.componentRef.setInput('current', 4);
    fixture.detectChanges();

    const friends = fixture.nativeElement.querySelector(
      '[data-testid="stepper-step-5"]'
    ) as HTMLButtonElement;
    expect(friends.classList.contains('is-locked')).toBe(true);
    expect(friends.disabled).toBe(true);

    const emitted: number[] = [];
    component.stepClick.subscribe((k) => emitted.push(k));
    friends.click();
    expect(emitted).toEqual([]);

    // Earlier steps still emit normally.
    (fixture.nativeElement.querySelector('[data-testid="stepper-step-3"]') as HTMLElement).click();
    expect(emitted).toEqual([3]);
  });

  it('shows step number and label so people know which step they\'re on', () => {
    const friends = fixture.nativeElement.querySelector(
      '[data-testid="stepper-step-5"]'
    ) as HTMLElement;
    // Friends is at index 2 → "3" of 9
    expect(friends.textContent).toContain('3');
    expect(friends.textContent).toContain('Friends');
  });
});
