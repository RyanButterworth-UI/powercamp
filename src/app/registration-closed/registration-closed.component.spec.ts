import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegistrationClosedComponent } from './registration-closed.component';

describe('RegistrationClosedComponent', () => {
  let fixture: ComponentFixture<RegistrationClosedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegistrationClosedComponent],
      // The embedded feedback form fetches /public-config on init.
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(RegistrationClosedComponent);
    fixture.componentRef.setInput('waitlistEmail', 'hello@powercamp.test');
    fixture.detectChanges();
  });

  it('renders a mailto link to the camp address', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="waitlist-mailto"]'
    );
    expect(link.getAttribute('href')).toContain('mailto:hello@powercamp.test');
    expect(fixture.nativeElement.textContent).toContain('Registrations are closed');
  });

  it('offers no 2027 sign-up — nothing is open yet', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="waitlist-start"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('nothing to sign up for');
  });

  it('leads with the post-camp thank-you rather than a "camp is full" message', () => {
    expect(fixture.nativeElement.textContent).toContain("That's a wrap on Power Camp 2026");
  });

  it('embeds the highlights video and the feedback form', () => {
    const iframe: HTMLIFrameElement = fixture.nativeElement.querySelector(
      '[data-testid="highlights-video"] iframe'
    );
    expect(iframe.getAttribute('src')).toContain('youtube.com/embed/80OJqIUfw_U');
    expect(fixture.nativeElement.querySelector('[data-testid="feedback-embed"]')).toBeTruthy();
  });

  it('points at 2027 without inventing dates', () => {
    const panel = fixture.nativeElement.querySelector('[data-testid="next-year"]');
    expect(panel.textContent).toContain('Power Camp 2027');
    expect(panel.textContent).toContain("We don't have dates yet");
  });
});
