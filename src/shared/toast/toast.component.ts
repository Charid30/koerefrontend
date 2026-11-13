import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    <div
      class="fixed top-4 right-4 z-9999 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      @for (t of svc.toasts(); track t.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 min-w-72 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in"
          [ngClass]="{
            'bg-green-50 border-green-200 text-green-800': t.type === 'success',
            'bg-red-50   border-red-200   text-red-800': t.type === 'error',
            'bg-blue-50  border-blue-200  text-blue-800': t.type === 'info',
          }"
        >
          <!-- Icône -->
          <span class="mt-0.5 shrink-0">
            @if (t.type === 'success') {
              <svg
                class="w-5 h-5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
            @if (t.type === 'error') {
              <svg
                class="w-5 h-5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            }
            @if (t.type === 'info') {
              <svg
                class="w-5 h-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          </span>
          <!-- Message -->
          <span class="flex-1 leading-snug">{{ t.message }}</span>
          <!-- Fermer -->
          <button
            (click)="svc.dismiss(t.id)"
            class="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .animate-fade-in {
        animation: fade-in 0.2s ease-out;
      }
    `,
  ],
})
export class ToastComponent {
  svc = inject(ToastService);
}
