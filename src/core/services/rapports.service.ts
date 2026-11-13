import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RapportsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private telecharger(url: string, filename: string) {
    this.http.get(`${this.base}/${url}`, { responseType: 'blob' }).subscribe(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  etatParc() {
    this.telecharger('rapports/etat-parc', `etat-parc-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  historiqueVehicule(id: number) {
    this.telecharger(`rapports/vehicule/${id}`, `historique-vehicule-${id}.xlsx`);
  }

  rapportMensuel(annee: number, mois: number) {
    this.telecharger(`rapports/mensuel?annee=${annee}&mois=${mois}`,
      `rapport-mensuel-${annee}-${String(mois).padStart(2,'0')}.xlsx`);
  }

  etatStock() {
    this.telecharger('rapports/stock', `etat-stock-${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}
