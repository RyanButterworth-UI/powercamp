import { SummaryComponent } from './summary.component';
import { mountStep } from '../testing/step-host';

describe('SummaryComponent', () => {
  it('should create', () => {
    const { child } = mountStep(SummaryComponent);
    expect(child).toBeTruthy();
  });
});
