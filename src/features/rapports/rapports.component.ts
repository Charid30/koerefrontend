import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RapportsService } from '../../core/services/rapports.service';
import { VehiculesService } from '../../core/services/vehicules.service';
import { Vehicule } from '../../core/models/vehicule.model';

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports.component.html',
})
export class RapportsComponent {
  private svc = inject(RapportsService);
  private vehiculesSvc = inject(VehiculesService);

  vehicules = signal<Vehicule[]>([]);
  vehiculeId = signal<number | null>(null);

  annee = new Date().getFullYear();
  mois = new Date().getMonth() + 1;
  readonly moisOptions = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
  ];
  readonly annees = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ];

  constructor() {
    this.vehiculesSvc.getAll({ limit: 200 }).subscribe({
      next: r => this.vehicules.set(r.data),
    });
  }

  telechargerEtatParc() { this.svc.etatParc(); }
  telechargerHistorique() {
    const id = this.vehiculeId();
    if (id) this.svc.historiqueVehicule(id);
  }
  telechargerMensuel() { this.svc.rapportMensuel(this.annee, this.mois); }
  telechargerStock() { this.svc.etatStock(); }
}
