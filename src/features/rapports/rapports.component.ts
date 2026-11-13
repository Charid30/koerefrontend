import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { RapportsService } from '../../core/services/rapports.service';
import { VehiculesService } from '../../core/services/vehicules.service';
import { ToastService } from '../../core/services/toast.service';
import { Vehicule } from '../../core/models/vehicule.model';

export type CleRapport = 'parc' | 'stock' | 'mensuel' | 'vehicule';

interface EtatTelechargement {
  enCours: boolean;
  dernier?: Date;
}

@Component({
  selector: 'app-rapports',
  imports: [FormsModule, NgClass, NgTemplateOutlet, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rapports.component.html',
})
export class RapportsComponent {
  private readonly svc = inject(RapportsService);
  private readonly vehiculesSvc = inject(VehiculesService);
  private readonly toast = inject(ToastService);

  readonly vehicules = signal<Vehicule[]>([]);
  readonly vehiculeId = signal<number | null>(null);
  readonly vehiculeChoisi = computed(() => this.vehicules().find((v) => v.id === this.vehiculeId()) ?? null);

  private readonly maintenant = new Date();
  readonly annee = signal(this.maintenant.getFullYear());
  readonly mois = signal(this.maintenant.getMonth() + 1);

  readonly moisOptions = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ].map((label, i) => ({ value: i + 1, label }));

  readonly annees = [0, 1, 2].map((n) => this.maintenant.getFullYear() - n);

  /** Raccourcis de période pour le rapport mensuel */
  readonly raccourcis = (() => {
    const d = this.maintenant;
    const precedent = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return [
      { label: 'Ce mois', annee: d.getFullYear(), mois: d.getMonth() + 1 },
      { label: 'Mois dernier', annee: precedent.getFullYear(), mois: precedent.getMonth() + 1 },
    ];
  })();

  readonly periodeLibelle = computed(
    () => `${this.moisOptions[this.mois() - 1].label} ${this.annee()}`,
  );

  /** Un mois futur n'a pas de données */
  readonly periodeFuture = computed(
    () =>
      this.annee() > this.maintenant.getFullYear() ||
      (this.annee() === this.maintenant.getFullYear() && this.mois() > this.maintenant.getMonth() + 1),
  );

  readonly etats = signal<Record<CleRapport, EtatTelechargement>>({
    parc: { enCours: false },
    stock: { enCours: false },
    mensuel: { enCours: false },
    vehicule: { enCours: false },
  });

  constructor() {
    this.vehiculesSvc.getAll({ limit: 200 }).subscribe({
      next: (r) => this.vehicules.set(r.data),
    });
  }

  etat(cle: CleRapport): EtatTelechargement {
    return this.etats()[cle];
  }

  choisirPeriode(annee: number, mois: number) {
    this.annee.set(annee);
    this.mois.set(mois);
  }

  estPeriode(annee: number, mois: number) {
    return this.annee() === annee && this.mois() === mois;
  }

  telecharger(cle: CleRapport) {
    let requete: Observable<void> | null = null;
    let libelle = '';
    switch (cle) {
      case 'parc':
        requete = this.svc.etatParc();
        libelle = 'État du parc';
        break;
      case 'stock':
        requete = this.svc.etatStock();
        libelle = 'État du stock';
        break;
      case 'mensuel':
        requete = this.svc.rapportMensuel(this.annee(), this.mois());
        libelle = `Rapport de ${this.periodeLibelle()}`;
        break;
      case 'vehicule': {
        const v = this.vehiculeChoisi();
        if (!v) return;
        requete = this.svc.historiqueVehicule(v.id, v.numeroInterne);
        libelle = `Historique ${v.numeroInterne}`;
        break;
      }
    }
    if (!requete || this.etats()[cle].enCours) return;

    this.majEtat(cle, { enCours: true });
    requete.subscribe({
      next: () => {
        this.majEtat(cle, { enCours: false, dernier: new Date() });
        this.toast.success(`${libelle} téléchargé`);
      },
      error: () => {
        this.majEtat(cle, { enCours: false });
        this.toast.error(`Échec du téléchargement : ${libelle}. Réessayez.`);
      },
    });
  }

  private majEtat(cle: CleRapport, etat: EtatTelechargement) {
    this.etats.update((e) => ({ ...e, [cle]: { ...e[cle], ...etat } }));
  }
}
