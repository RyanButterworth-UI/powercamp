import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

interface ConfirmRequest {
  id: number;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (ok: boolean) => void;
}

interface PromptRequest {
  id: number;
  text: string;
  defaultValue: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  inputType: 'text' | 'email' | 'password';
  resolve: (value: string | null) => void;
}

@Injectable({ providedIn: 'root' })
export class UiService {
  private nextId = 1;
  toasts = signal<Toast[]>([]);
  confirmRequest = signal<ConfirmRequest | null>(null);
  promptRequest = signal<PromptRequest | null>(null);

  // Active in-flight HTTP request count. Driven by the loading interceptor —
  // any code path that wants to show "we're talking to the server" reads
  // `loading()` and trusts the interceptor to keep it accurate.
  private inFlight = signal(0);
  loading = this.inFlight.asReadonly();

  beginLoading(): void {
    this.inFlight.update((n) => n + 1);
  }

  endLoading(): void {
    this.inFlight.update((n) => Math.max(0, n - 1));
  }

  toast(text: string, kind: Toast['kind'] = 'info', durationMs = 4000): void {
    const id = this.nextId++;
    this.toasts.update((t) => [...t, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  confirm(text: string, confirmLabel = 'Confirm', cancelLabel = 'Cancel'): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmRequest.set({ id: this.nextId++, text, confirmLabel, cancelLabel, resolve });
    });
  }

  resolveConfirm(ok: boolean): void {
    const req = this.confirmRequest();
    if (!req) return;
    this.confirmRequest.set(null);
    req.resolve(ok);
  }

  prompt(opts: {
    text: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    inputType?: 'text' | 'email' | 'password';
  }): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.promptRequest.set({
        id: this.nextId++,
        text: opts.text,
        defaultValue: opts.defaultValue ?? '',
        placeholder: opts.placeholder ?? '',
        confirmLabel: opts.confirmLabel ?? 'OK',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        inputType: opts.inputType ?? 'text',
        resolve,
      });
    });
  }

  resolvePrompt(value: string | null): void {
    const req = this.promptRequest();
    if (!req) return;
    this.promptRequest.set(null);
    req.resolve(value);
  }
}
