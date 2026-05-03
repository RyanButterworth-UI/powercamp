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

@Injectable({ providedIn: 'root' })
export class UiService {
  private nextId = 1;
  toasts = signal<Toast[]>([]);
  confirmRequest = signal<ConfirmRequest | null>(null);

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
}
