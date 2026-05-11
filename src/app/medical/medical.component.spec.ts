import { MedicalComponent } from './medical.component';
import { mountStep } from '../testing/step-host';

describe('MedicalComponent', () => {
  it('should create', () => {
    const { child } = mountStep(MedicalComponent);
    expect(child).toBeTruthy();
  });
});
