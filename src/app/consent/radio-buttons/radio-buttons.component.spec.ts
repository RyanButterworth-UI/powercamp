import { RadioButtonsComponent } from './radio-buttons.component';
import { mountStep } from '../../testing/step-host';

describe('RadioButtonsComponent', () => {
  it('should create', () => {
    const { child } = mountStep(RadioButtonsComponent, {
      formGroupLabel: "'gender'",
    });
    expect(child).toBeTruthy();
  });
});
