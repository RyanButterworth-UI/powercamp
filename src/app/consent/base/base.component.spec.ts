import { BaseComponent } from './base.component';
import { mountStep } from '../../testing/step-host';

describe('BaseComponent', () => {
  it('should create', () => {
    // BaseComponent wraps a RadioButtonsComponent which needs a parent
    // formGroup. The host fixture supplies one; the gender control is a
    // safe target for the radio's formControlName.
    const { child } = mountStep(BaseComponent, {
      consentText: "'Test consent text'",
      formControlNameLabel: "'gender'",
    });
    expect(child).toBeTruthy();
  });
});
