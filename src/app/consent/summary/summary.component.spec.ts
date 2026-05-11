import { SummaryComponent } from './summary.component';
import { mountStep } from '../../testing/step-host';

describe('SummaryComponent (consent)', () => {
  it('should create', () => {
    const { child } = mountStep(SummaryComponent);
    expect(child).toBeTruthy();
  });
});
