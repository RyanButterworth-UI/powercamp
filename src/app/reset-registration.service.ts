import { Injectable } from '@angular/core';

/**
 * One-shot bridge so any registration step can trigger the form's
 * confirm-and-reset flow without each step needing its own Output binding.
 *
 * The form component registers a callback on construct; step components
 * call `request()` from their inline Restart button.
 */
@Injectable({ providedIn: 'root' })
export class ResetRegistrationService {
  private callback: (() => void) | null = null;

  register(fn: () => void): void {
    this.callback = fn;
  }

  request(): void {
    this.callback?.();
  }
}
