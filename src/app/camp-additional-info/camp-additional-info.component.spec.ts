import { CampAdditionalInfoComponent } from './camp-additional-info.component';
import { mountStep } from '../testing/step-host';

describe('CampAdditionalInfoComponent', () => {
  it('should create', () => {
    const { child } = mountStep(CampAdditionalInfoComponent);
    expect(child).toBeTruthy();
  });
});
