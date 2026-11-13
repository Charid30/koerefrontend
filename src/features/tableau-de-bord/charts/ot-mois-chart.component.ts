import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { GraphOtMois } from '../../../core/models/dashboard.model';

interface Colonne {
  mois: string;
  preventif: number;
  correctif: number;
  total: number;
  /** Hauteurs en % de la zone de tracé */
  hPreventif: number;
  hCorrectif: number;
}

/**
 * Histogramme empilé des OT par mois (préventif / correctif).
 * Une seule échelle, colonnes fines arrondies côté valeur, écart de 2px entre segments,
 * infobulle au survol et au focus clavier, et vue tableau équivalente.
 */
@Component({
  selector: 'app-ot-mois-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <ul class="flex items-center gap-4 text-xs text-gray-600" aria-label="Légende">
        <li class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-[3px] bg-(--series-preventif)"></span>Préventif
        </li>
        <li class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-[3px] bg-(--series-correctif)"></span>Correctif
        </li>
      </ul>
      <button
        type="button"
        (click)="vueTableau.set(!vueTableau())"
        class="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md hover:bg-gray-100"
        [attr.aria-pressed]="vueTableau()"
      >
        {{ vueTableau() ? 'Voir le graphique' : 'Voir le tableau' }}
      </button>
    </div>

    @if (vueTableau()) {
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm tabular-nums">
          <thead>
            <tr class="text-left text-xs text-gray-500 border-b border-gray-200">
              <th class="py-2 font-medium">Mois</th>
              <th class="py-2 font-medium text-right">Préventif</th>
              <th class="py-2 font-medium text-right">Correctif</th>
              <th class="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (c of colonnes(); track c.mois) {
              <tr class="border-b border-gray-100 last:border-0">
                <td class="py-1.5 text-gray-700">{{ c.mois }}</td>
                <td class="py-1.5 text-right text-gray-700">{{ c.preventif }}</td>
                <td class="py-1.5 text-right text-gray-700">{{ c.correctif }}</td>
                <td class="py-1.5 text-right font-medium text-gray-900">{{ c.total }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="relative mt-7 flex gap-2">
        <!-- Axe Y -->
        <div class="relative h-48 w-6 shrink-0 text-[11px] text-gray-400 tabular-nums" aria-hidden="true">
          @for (t of ticks(); track t) {
            <span class="absolute right-0 -translate-y-1/2" [style.bottom.%]="(t / max()) * 100">{{ t }}</span>
          }
        </div>

        <div class="flex-1 min-w-0">
          <!-- Zone de tracé -->
          <div class="relative h-48">
            @for (t of ticks(); track t) {
              <div
                class="absolute inset-x-0 h-px"
                [class]="t === 0 ? 'bg-gray-300' : 'bg-gray-100'"
                [style.bottom.%]="(t / max()) * 100"
              ></div>
            }

            <div class="absolute inset-0 flex">
              @for (c of colonnes(); track c.mois; let i = $index; let last = $last) {
                <div
                  class="group relative flex-1 flex flex-col items-center justify-end outline-none"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="c.mois + ' : ' + c.preventif + ' préventif(s), ' + c.correctif + ' correctif(s)'"
                  (pointerenter)="actif.set(i)"
                  (pointerleave)="actif.set(null)"
                  (focus)="actif.set(i)"
                  (blur)="actif.set(null)"
                >
                  <!-- Fond de survol -->
                  <div
                    class="absolute inset-y-0 inset-x-0.5 rounded-md transition-colors"
                    [class.bg-gray-100]="actif() === i"
                  ></div>

                  <!-- Valeur au sommet du dernier mois uniquement -->
                  @if (last && c.total > 0) {
                    <span
                      class="relative mb-1 text-[11px] font-semibold text-gray-700 tabular-nums"
                      >{{ c.total }}</span
                    >
                  }

                  <div class="relative w-full max-w-6 flex flex-col justify-end" [style.height.%]="c.hPreventif + c.hCorrectif">
                    @if (c.correctif > 0) {
                      <div
                        class="w-full bg-(--series-correctif) rounded-t-[4px]"
                        [style.height.%]="(c.correctif / c.total) * 100"
                      ></div>
                    }
                    @if (c.correctif > 0 && c.preventif > 0) {
                      <div class="h-0.5 w-full shrink-0"></div>
                    }
                    @if (c.preventif > 0) {
                      <div
                        class="w-full bg-(--series-preventif)"
                        [class.rounded-t-[4px]]="c.correctif === 0"
                        [style.height.%]="(c.preventif / c.total) * 100"
                      ></div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Infobulle -->
            @if (colonneActive(); as c) {
              <div
                class="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/5 whitespace-nowrap"
                [style.left.%]="positionInfobulle()"
                [class.-translate-x-full]="actif()! > colonnes().length / 2"
              >
                <p class="text-gray-500 mb-1">{{ c.mois }}</p>
                <p class="flex items-center gap-2">
                  <span class="w-3 h-0.5 rounded-full bg-(--series-preventif)"></span>
                  <span class="font-semibold text-gray-900 tabular-nums">{{ c.preventif }}</span>
                  <span class="text-gray-500">préventif</span>
                </p>
                <p class="flex items-center gap-2">
                  <span class="w-3 h-0.5 rounded-full bg-(--series-correctif)"></span>
                  <span class="font-semibold text-gray-900 tabular-nums">{{ c.correctif }}</span>
                  <span class="text-gray-500">correctif</span>
                </p>
              </div>
            }
          </div>

          <!-- Axe X -->
          <div class="mt-2 flex text-[11px] text-gray-400" aria-hidden="true">
            @for (c of colonnes(); track c.mois; let i = $index) {
              <span class="flex-1 text-center whitespace-nowrap" [class.max-sm:invisible]="i % 2 === 1">{{
                moisCourt(c.mois)
              }}</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  host: {
    class: 'block',
    style: '--series-preventif: #7135d4; --series-correctif: #eb6834;',
  },
})
export class OtMoisChartComponent {
  readonly data = input.required<GraphOtMois[]>();

  readonly vueTableau = signal(false);
  readonly actif = signal<number | null>(null);

  /** Maximum arrondi à une valeur « propre » pour l'axe */
  readonly max = computed(() => {
    const m = Math.max(0, ...this.data().map((d) => d.preventif + d.correctif));
    if (m <= 4) return 4;
    const pas = Math.pow(10, Math.floor(Math.log10(m)));
    const n = m / pas;
    const propre = n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return propre * pas;
  });

  readonly ticks = computed(() => {
    const max = this.max();
    return [0, max / 4, max / 2, (3 * max) / 4, max].filter((t) => Number.isInteger(t));
  });

  readonly colonnes = computed<Colonne[]>(() =>
    this.data().map((d) => ({
      ...d,
      total: d.preventif + d.correctif,
      hPreventif: (d.preventif / this.max()) * 100,
      hCorrectif: (d.correctif / this.max()) * 100,
    })),
  );

  readonly colonneActive = computed(() => {
    const i = this.actif();
    return i === null ? null : this.colonnes()[i];
  });

  readonly positionInfobulle = computed(() => {
    const i = this.actif() ?? 0;
    const n = this.colonnes().length || 1;
    return i > n / 2 ? ((i + 0.5) / n) * 100 - 2 : ((i + 0.5) / n) * 100 + 2;
  });

  /** « janv. 26 » → « janv. » */
  moisCourt(mois: string): string {
    return mois.split(' ')[0];
  }
}
