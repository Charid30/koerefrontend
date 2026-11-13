import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { RapportsService } from '../../../core/services/rapports.service';
import { Vehicule } from '../../../core/models/vehicule.model';

@Component({
  selector: 'app-vehicule-detail',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './vehicule-detail.component.html',
})
export class VehiculeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(VehiculesService);
  private rapports = inject(RapportsService);

  vehicule = signal<Vehicule | null>(null);
  loading = signal(true);
  historique = signal<any | null>(null);
  onglet = signal<'infos' | 'inspections' | 'ot' | 'di' | 'maintenance'>('infos');
  readonly today = new Date();

  private types = [
    { value: 'VOITURE', label: 'Voiture' },
    { value: 'CAMION', label: 'Camion' },
    { value: 'EQUIPEMENT_SPECIAL', label: 'Équipement spécial' },
    { value: 'ENGIN_TP', label: 'Engin TP' },
  ];

  private statuts = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'EN_CIRCULATION', label: 'En circulation' },
    { value: 'EN_MAINTENANCE', label: 'En maintenance' },
    { value: 'EN_ATTENTE_REPARATION_EXTERNE', label: 'Att. réparation ext.' },
    { value: 'EN_ATTENTE_PIECES', label: 'Att. pièces' },
    { value: 'IMMOBILISE', label: 'Immobilisé' },
    { value: 'ACCIDENTE', label: 'Accidenté' },
    { value: 'HORS_SERVICE', label: 'Hors service' },
  ];

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getOne(id).subscribe({
      next: (v) => { this.vehicule.set(v); this.loading.set(false); },
      error: () => { this.vehicule.set(null); this.loading.set(false); },
    });
    this.svc.getHistorique(id).subscribe({
      next: h => this.historique.set(h),
    });
  }

  setOnglet(o: 'infos' | 'inspections' | 'ot' | 'di' | 'maintenance') { this.onglet.set(o); }
  exporterHistorique() {
    const v = this.vehicule();
    if (v) this.rapports.historiqueVehicule(v.id);
  }

  typeLabel(t: string) { return this.types.find(x => x.value === t)?.label ?? t; }
  statutLabel(s: string) { return this.statuts.find(x => x.value === s)?.label ?? s; }
  statutClass(s: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'bg-green-100 text-green-700',
      EN_CIRCULATION: 'bg-blue-100 text-blue-700',
      EN_MAINTENANCE: 'bg-orange-100 text-orange-700',
      IMMOBILISE: 'bg-red-100 text-red-700',
      ACCIDENTE: 'bg-red-200 text-red-800',
      HORS_SERVICE: 'bg-gray-200 text-gray-600',
    };
    return m[s] ?? 'bg-gray-100 text-gray-600';
  }
}
