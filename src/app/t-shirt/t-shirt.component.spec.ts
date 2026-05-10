import { TShirtComponent } from './t-shirt.component';
import { mountStep } from '../testing/step-host';

describe('TShirtComponent', () => {
  it('should create', () => {
    const { child } = mountStep(TShirtComponent);
    expect(child).toBeTruthy();
  });
});
