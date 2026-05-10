import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { SagaSelectComponent, SagaSelectOption } from './saga-select.component';

describe('SagaSelectComponent', () => {
  let fixture: ComponentFixture<SagaSelectComponent>;
  let component: SagaSelectComponent;
  let control: FormControl;

  const options: SagaSelectOption[] = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
    { value: 'c', label: 'Cherry' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SagaSelectComponent] }).compileComponents();
    control = new FormControl<string>('');
    fixture = TestBed.createComponent(SagaSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('placeholder', 'Pick one…');
    fixture.detectChanges();
  });

  it('shows the placeholder when no value is selected', () => {
    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="saga-select-trigger"]'
    ) as HTMLElement;
    expect(trigger.textContent).toContain('Pick one…');
  });

  it('renders the menu only when opened', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="saga-select-menu"]')).toBeNull();
    component.toggle();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="saga-select-menu"]')).not.toBeNull();
  });

  it('renders one option button per provided option', () => {
    component.toggle();
    fixture.detectChanges();
    const opts = fixture.nativeElement.querySelectorAll('[data-testid^="saga-select-option-"]');
    expect(opts.length).toBe(options.length);
  });

  it('selecting an option writes to the FormControl and closes the menu', () => {
    component.toggle();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector(
      '[data-testid="saga-select-option-b"]'
    ) as HTMLElement).click();
    fixture.detectChanges();
    expect(control.value).toBe('b');
    expect(component.open()).toBe(false);
  });

  it('shows the selected label on the trigger after a selection', () => {
    component.toggle();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector(
      '[data-testid="saga-select-option-c"]'
    ) as HTMLElement).click();
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '[data-testid="saga-select-trigger"]'
    ) as HTMLElement;
    expect(trigger.textContent).toContain('Cherry');
  });

  it('Escape closes the menu', () => {
    component.toggle();
    expect(component.open()).toBe(true);
    component.onEscape();
    expect(component.open()).toBe(false);
  });
});

describe('SagaSelectComponent — search', () => {
  let fixture: ComponentFixture<SagaSelectComponent>;
  let component: SagaSelectComponent;

  const options: SagaSelectOption[] = [
    { value: 'a', label: 'AGS Silverton' },
    { value: 'b', label: 'Antipas' },
    { value: 'c', label: 'Brackenhurst Baptist Church' },
    { value: 'd', label: 'Grace Fellowship Pretoria' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SagaSelectComponent] }).compileComponents();
    fixture = TestBed.createComponent(SagaSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', new FormControl<string>(''));
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('enableSearch', true);
    fixture.detectChanges();
    component.toggle();
    fixture.detectChanges();
  });

  it('renders a search input when enableSearch is true', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="saga-select-search"]'
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
  });

  it('filters options by case-insensitive label match', () => {
    component.searchQuery.set('baptist');
    fixture.detectChanges();
    const visible = fixture.nativeElement.querySelectorAll('[data-testid^="saga-select-option-"]');
    expect(visible.length).toBe(1);
    expect((visible[0] as HTMLElement).textContent).toContain('Brackenhurst Baptist Church');
  });

  it('shows a "No matches" hint when nothing matches', () => {
    component.searchQuery.set('zzzz');
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('[data-testid="saga-select-empty"]');
    expect(empty).not.toBeNull();
  });

  it('clears the search query when the menu closes', () => {
    component.searchQuery.set('grace');
    component.onEscape();
    fixture.detectChanges(); // flush the close-effect that wipes the query
    expect(component.searchQuery()).toBe('');
  });
});
