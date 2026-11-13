import { ChangeDetectionStrategy, Component, input, signal, effect } from '@angular/core';
import { NgClass } from '@angular/common';

export type NiveauAlerte = 'attention' | 'critique';

/**
 * Alerte flottante en bas à droite de l'écran, à la place des bandeaux en haut de page.
 * Repliable en une pastille (état mémorisé pour la session, par `cle`).
 * Le contenu (liste, actions) est projeté.
 */
@Component({
  selector: 'app-alerte-flottante',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-sm:left-4">
      @if (ouverte()) {
        <section
          class="w-full sm:w-96 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-[alerte-entree_.2s_ease-out]"
          role="status"
          [attr.aria-label]="titre()"
        >
          <header class="flex items-start gap-3 px-4 pt-4 pb-3">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              [ngClass]="niveau() === 'critique' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'"
              aria-hidden="true"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-semibold text-gray-900">{{ titre() }}</h2>
              @if (sousTitre()) {
                <p class="text-xs text-gray-500">{{ sousTitre() }}</p>
              }
            </div>
            <button
              type="button"
              (click)="replier()"
              class="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Réduire l’alerte"
              title="Réduire"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </header>
          <div class="max-h-72 overflow-y-auto border-t border-gray-100">
            <ng-content />
          </div>
        </section>
      } @else {
        <button
          type="button"
          (click)="deplier()"
          class="inline-flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 text-sm font-medium text-gray-800 shadow-lg ring-1 ring-black/5 hover:shadow-xl"
          [attr.aria-label]="'Afficher l’alerte : ' + titre()"
        >
          <span
            class="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums"
            [ngClass]="niveau() === 'critique' ? 'bg-red-600' : 'bg-amber-500'"
          >{{ nombre() }}</span>
          {{ titreCourt() || titre() }}
        </button>
      }
    </div>
  `,
  styles: `
    @keyframes alerte-entree {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class AlerteFlottanteComponent {
  /** Clé de mémorisation de l'état replié (sessionStorage) */
  readonly cle = input.required<string>();
  readonly titre = input.required<string>();
  readonly titreCourt = input<string>('');
  readonly sousTitre = input<string>('');
  readonly nombre = input<number>(0);
  readonly niveau = input<NiveauAlerte>('attention');

  readonly ouverte = signal(true);

  constructor() {
    effect(() => {
      // Sans choix mémorisé : ouverte sur grand écran, repliée sur mobile (elle masquerait la liste).
      let memorise: string | null = null;
      try {
        memorise = sessionStorage.getItem(this.storageKey());
      } catch {
        /* stockage indisponible */
      }
      const grandEcran = typeof matchMedia === 'function' && matchMedia('(min-width: 640px)').matches;
      this.ouverte.set(memorise ? memorise === 'ouverte' : grandEcran);
    });
  }

  replier() {
    this.ouverte.set(false);
    this.memoriser('repliee');
  }

  deplier() {
    this.ouverte.set(true);
    this.memoriser('ouverte');
  }

  private storageKey() {
    return `alerte:${this.cle()}`;
  }

  private memoriser(valeur: string) {
    try {
      sessionStorage.setItem(this.storageKey(), valeur);
    } catch {
      /* ignoré */
    }
  }
}
