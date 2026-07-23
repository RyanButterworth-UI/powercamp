import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrationClosedComponent } from './registration-closed.component';

describe('RegistrationClosedComponent', () => {
  let fixture: ComponentFixture<RegistrationClosedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RegistrationClosedComponent] });
    fixture = TestBed.createComponent(RegistrationClosedComponent);
    fixture.componentRef.setInput('waitlistEmail', 'hello@powercamp.test');
    fixture.detectChanges();
  });

  it('renders the closed message and a mailto link to the waiting-list address', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="waitlist-mailto"]'
    );
    expect(link.getAttribute('href')).toContain('mailto:hello@powercamp.test');
    expect(fixture.nativeElement.textContent).toContain('Registrations are closed');
  });

  it('emits (join) when "Join the waiting list" is clicked', () => {
    let joined = false;
    fixture.componentInstance.join.subscribe(() => (joined = true));
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="waitlist-start"]'
    );
    btn.click();
    expect(joined).toBe(true);
  });
});
