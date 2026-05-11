import { ParentComponent } from './parent.component';
import { mountStep } from '../testing/step-host';

describe('ParentComponent', () => {
  it('should create', () => {
    const { child } = mountStep(ParentComponent);
    expect(child).toBeTruthy();
  });
});
