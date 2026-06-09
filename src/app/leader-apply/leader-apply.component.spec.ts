import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LeaderApplyComponent } from './leader-apply.component';

describe('LeaderApplyComponent', () => {
  let fixture: ComponentFixture<LeaderApplyComponent>;
  let navigate: jest.Mock;

  beforeEach(() => {
    navigate = jest.fn();
    TestBed.configureTestingModule({
      imports: [LeaderApplyComponent],
      providers: [{ provide: Router, useValue: { navigate } }],
    });
    fixture = TestBed.createComponent(LeaderApplyComponent);
    fixture.detectChanges();
  });

  it('shows the "leadership is full" message instead of an application form', () => {
    const panel = fixture.nativeElement.querySelector('[data-testid="leadership-full"]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toMatch(/leadership is full/i);
  });

  it('does not render any application/screening controls', () => {
    // The old screening + apply form is gone — guard against it creeping back.
    expect(fixture.nativeElement.querySelector('[data-testid="screening"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('navigates home when "Back to Home" is clicked', () => {
    fixture.componentInstance.goHome();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
