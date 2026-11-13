import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RapportsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Télécharge le fichier puis le propose à l'enregistrement. L'Observable permet d'afficher chargement et erreurs. */
  private telecharger(url: string, filename: string): Observable<void> {
    return this.http.get(`${this.base}/${url}`, { responseType: 'blob' }).pipe(
      map((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        // Libération différée : certains navigateurs annulent le téléchargement si l'URL est révoquée immédiatement.
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }),
    );
  }

  private aujourdhui() {
    return new Date().toISOString().slice(0, 10);
  }

  etatParc() {
    return this.telecharger('rapports/etat-parc', `etat-parc-${this.aujourdhui()}.xlsx`);
  }

  historiqueVehicule(id: number, numeroInterne?: string) {
    return this.telecharger(`rapports/vehicule/${id}`, `historique-${numeroInterne ?? `vehicule-${id}`}.xlsx`);
  }

  rapportMensuel(annee: number, mois: number) {
    return this.telecharger(
      `rapports/mensuel?annee=${annee}&mois=${mois}`,
      `rapport-mensuel-${annee}-${String(mois).padStart(2, '0')}.xlsx`,
    );
  }

  etatStock() {
    return this.telecharger('rapports/stock', `etat-stock-${this.aujourdhui()}.xlsx`);
  }
}
