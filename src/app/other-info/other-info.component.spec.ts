import { OtherInfoComponent } from './other-info.component';
import { mountStep } from '../testing/step-host';

describe('OtherInfoComponent', () => {
  it('should create', () => {
    const { child } = mountStep(OtherInfoComponent);
    expect(child).toBeTruthy();
  });
});
