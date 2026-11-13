import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GraphVehiculePanne } from '../../../core/models/dashboard.model';

/**
 * Barres horizontales : véhicules ayant le plus de demandes d'intervention.
 * Une seule série (pas de légende), valeur à l'extrémité de la barre.
 */
@Component({
  selector: 'app-vehicules-pannes-chart',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lignes().length) {
      <ul class="space-y-3">
        @for (l of lignes(); track l.id) {
          <li>
            <a
              [routerLink]="['/vehicules', l.id]"
              class="group block rounded-lg -mx-2 px-2 py-1 hover:bg-gray-50"
              [attr.aria-label]="l.label + ' : ' + l.nbDi + ' demande(s) d\\'intervention'"
            >
              <p class="text-sm text-gray-700 truncate group-hover:text-gray-900">{{ l.label }}</p>
              <div class="mt-1.5 flex items-center gap-2">
                <div class="flex-1 h-2 rounded-full bg-gray-100">
                  <div class="h-2 rounded-full bg-[#7135d4]" [style.width.%]="(l.nbDi / max()) * 100"></div>
                </div>
                <span class="w-6 text-right text-xs font-semibold text-gray-700 tabular-nums">{{
                  l.nbDi
                }}</span>
              </div>
            </a>
          </li>
        }
      </ul>
    } @else {
      <div class="py-6 text-center">
        <p class="text-sm text-gray-500">Aucune panne signalée</p>
        <p class="text-xs text-gray-400 mt-0.5">sur l'ensemble du parc</p>
      </div>
    }
  `,
})
export class VehiculesPannesChartComponent {
  readonly data = input.required<GraphVehiculePanne[]>();

  readonly lignes = computed(() =>
    [...this.data()]
      .filter((v) => v.nbDi > 0)
      .sort((a, b) => b.nbDi - a.nbDi)
      .slice(0, 5),
  );

  readonly max = computed(() => Math.max(1, ...this.lignes().map((l) => l.nbDi)));
}
