import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _counter = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, duration = 4000) { this._add('success', message, duration); }
  error(message: string, duration = 5000)   { this._add('error',   message, duration); }
  info(message: string, duration = 4000)    { this._add('info',    message, duration); }

  private _add(type: ToastType, message: string, duration: number) {
    const id = ++this._counter;
    this.toasts.update(list => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
