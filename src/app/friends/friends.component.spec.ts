import { FriendsComponent } from './friends.component';
import { mountStep } from '../testing/step-host';

describe('FriendsComponent', () => {
  it('should create', () => {
    const { child } = mountStep(FriendsComponent);
    expect(child).toBeTruthy();
  });
});
