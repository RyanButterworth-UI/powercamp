import { CamperInfoComponent } from './camper-info.component';
import { mountStep } from '../testing/step-host';

describe('CamperInfoComponent', () => {
  it('should create', () => {
    const { child } = mountStep(CamperInfoComponent);
    expect(child).toBeTruthy();
  });
});
