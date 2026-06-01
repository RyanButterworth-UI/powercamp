import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntroComponent } from './intro.component';
import { StepKey } from '../../models';

describe('IntroComponent', () => {
  let component: IntroComponent;
  let fixture: ComponentFixture<IntroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntroComponent);
    fixture.componentRef.setInput('stepVisible', true);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the 2026 dates', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Power Camp 2026');
    expect(text).toContain('31 July');
    expect(text).toContain('2 August 2026');
  });

  it('emits goToStep(CamperInfo) when Start Registration is clicked', () => {
    let emitted: number | undefined;
    component.goToStep.subscribe((s: number) => (emitted = s));

    const btn = fixture.nativeElement.querySelector('button');
    btn.click();

    expect(emitted).toBe(StepKey.CamperInfo);
  });

  it('shows the camp dates / location / cost (merged from the old Details step)', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('YFC Magaliesburg');
    expect(text).toContain('R1350');
    expect(text).toContain('grade 8');
  });
});
