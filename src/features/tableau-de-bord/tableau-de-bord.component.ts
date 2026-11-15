import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardData } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
import { OtMoisChartComponent } from './charts/ot-mois-chart.component';
import { VehiculesPannesChartComponent } from './charts/vehicules-pannes-chart.component';

/** Statut porté par une tuile : toujours affiché avec une icône et un libellé. */
export type Statut = 'ok' | 'attention' | 'critique';

export interface Tendance {
  /** Points SVG (viewBox 0 0 100 32) */
  points: string;
  dernier: { x: number; y: number };
  delta: number;
  /** Mois de comparaison, ex. « oct. » */
  reference: string;
  description: string;
}

export interface Tuile {
  label: string;
  valeur: string;
  detail: string;
  lien?: string;
  statut?: { niveau: Statut; texte: string };
  tendance?: Tendance;
}

export interface Action {
  niveau: Statut;
  titre: string;
  detail: string;
  lien: string;
  /** Libellé du bouton ; absent en lecture seule (direction) */
  action?: string;
}

export interface SegmentFlotte {
  label: string;
  valeur: number;
  couleur: string;
}

@Component({
  selector: 'app-tableau-de-bord',
  imports: [
    NgClass,
    NgTemplateOutlet,
    RouterLink,
    DatePipe,
    OtMoisChartComponent,
    VehiculesPannesChartComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tableau-de-bord.component.html',
})
export class TableauDeBordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly today = new Date();

  readonly role = this.auth.role;
  readonly prenom = computed(() => this.auth.user()?.prenom ?? '');
  readonly isDirection = computed(() => this.role() === 'DIRECTION');
  readonly isMecanicien = computed(() => this.role() === 'MECANICIEN');
  readonly isChauffeur = computed(() => this.role() === 'CHAUFFEUR');
  /** ADMIN, RESPONSABLE_PARC, RESPONSABLE_MAINTENANCE */
  readonly isGestion = computed(
    () => !this.isDirection() && !this.isMecanicien() && !this.isChauffeur(),
  );
  /** Graphiques d'analyse : gestionnaires et direction */
  /** Le bouton « Nouvel OT » ne s'affiche que si l'API autorise la création */
  readonly peutCreerOt = computed(() => this.role() !== null && this.auth.peut('ot.creer'));

  readonly voitAnalyses = computed(() => this.isGestion() || this.isDirection());

  readonly salutation = computed(() => (this.today.getHours() < 18 ? 'Bonjour' : 'Bonsoir'));

  // ── Flotte ────────────────────────────────────────────────────────────────
  readonly tauxDisponibilite = computed(() => {
    const d = this.data();
    if (!d) return 0;
    if (d.kpis?.tauxDisponibilite != null) return Math.round(d.kpis.tauxDisponibilite);
    const v = d.vehicules;
    return v.total ? Math.round(((v.disponibles + v.enCirculation) / v.total) * 100) : 0;
  });

  readonly statutDisponibilite = computed<{ niveau: Statut; texte: string }>(() => {
    const t = this.tauxDisponibilite();
    if (t >= 80) return { niveau: 'ok', texte: 'Objectif atteint' };
    if (t >= 60) return { niveau: 'attention', texte: 'Sous l’objectif' };
    return { niveau: 'critique', texte: 'Critique' };
  });

  readonly segmentsFlotte = computed<SegmentFlotte[]>(() => {
    const v = this.data()?.vehicules;
    if (!v) return [];
    return [
      { label: 'Disponibles', valeur: v.disponibles, couleur: '#0ca30c' },
      { label: 'En circulation', valeur: v.enCirculation, couleur: '#2a78d6' },
      { label: 'En maintenance', valeur: v.enMaintenance, couleur: '#fab219' },
      { label: 'Immobilisés', valeur: v.immobilises, couleur: '#d03b3b' },
    ];
  });

  readonly ariaFlotte = computed(() =>
    this.segmentsFlotte()
      .map((s) => `${s.label} : ${s.valeur}`)
      .join(', '),
  );

  // ── Tuiles selon le rôle ──────────────────────────────────────────────────
  readonly tuiles = computed<Tuile[]>(() => {
    const d = this.data();
    if (!d) return [];
    const ot = d.ordresTravail;
    const di = d.demandesIntervention;
    const diPrioritaires = di.urgentes + di.critiques;

    const tOt: Tuile = {
      label: 'OT en cours',
      valeur: String(ot.enCours),
      detail: `${ot.planifies} planifié(s) · ${ot.enAttente} en attente`,
      lien: '/ordres-travail',
      statut:
        ot.enAttente > 0
          ? { niveau: 'attention', texte: `${ot.enAttente} à valider` }
          : undefined,
    };
    const tDi: Tuile = {
      label: 'Pannes à traiter',
      valeur: String(di.enAttente),
      detail: `${di.critiques} critique(s) · ${di.urgentes} urgente(s)`,
      lien: this.isDirection() ? undefined : '/demandes-intervention',
      statut:
        di.critiques > 0
          ? { niveau: 'critique', texte: `${di.critiques} critique(s)` }
          : diPrioritaires > 0
            ? { niveau: 'attention', texte: `${di.urgentes} urgente(s)` }
            : { niveau: 'ok', texte: 'Rien d’urgent' },
    };
    const tStock: Tuile = {
      label: 'Alertes stock',
      valeur: String(d.stock.alertesSeuil),
      detail: `sur ${d.stock.totalReferences} références`,
      // La page Stocks n'est ouverte qu'aux rôles autorisés par l'API
      lien: this.auth.peut('stock.gerer') ? '/stocks' : undefined,
      statut:
        d.stock.alertesSeuil > 0
          ? { niveau: 'critique', texte: 'Sous le seuil' }
          : { niveau: 'ok', texte: 'Stock suffisant' },
    };
    tOt.tendance = this.tendanceOt() ?? undefined;

    if (this.isChauffeur()) {
      return [
        {
          label: 'En circulation',
          valeur: String(d.vehicules.enCirculation),
          detail: 'véhicules en mission',
          lien: '/vehicules',
        },
        { ...tDi, label: 'Pannes signalées', lien: '/demandes-intervention' },
      ];
    }
    return [tOt, tDi, tStock];
  });

  /** Tendance des OT créés sur les 6 derniers mois (seul indicateur dont l'API fournit l'historique). */
  readonly tendanceOt = computed<Tendance | null>(() => {
    const mois = this.data()?.graphiques?.otParMois ?? [];
    if (mois.length < 2) return null;
    const derniers = mois.slice(-6);
    const totaux = derniers.map((m) => m.preventif + m.correctif);
    const precedent = derniers[derniers.length - 2];
    const max = Math.max(1, ...totaux);
    const pas = 100 / (totaux.length - 1);
    return {
      points: totaux.map((v, i) => `${(i * pas).toFixed(1)},${(28 - (v / max) * 24).toFixed(1)}`).join(' '),
      dernier: { x: 100, y: 28 - (totaux[totaux.length - 1] / max) * 24 },
      delta: totaux[totaux.length - 1] - totaux[totaux.length - 2],
      reference: precedent.mois.split(' ')[0],
      description: `OT créés par mois : ${derniers.map((m, i) => `${m.mois} ${totaux[i]}`).join(', ')}`,
    };
  });

  // ── « À faire » : actions prioritaires, critiques d'abord ─────────────────
  readonly aFaire = computed<Action[]>(() => {
    const d = this.data();
    if (!d) return [];
    const actions: Action[] = [];
    const lecture = this.isDirection();

    const di = d.demandesIntervention;
    if (di.critiques > 0)
      actions.push({
        niveau: 'critique',
        titre: `${di.critiques} panne(s) critique(s)`,
        detail: 'Véhicules potentiellement à l’arrêt',
        lien: '/demandes-intervention',
        action: lecture ? undefined : 'Traiter',
      });
    if (di.urgentes > 0)
      actions.push({
        niveau: 'attention',
        titre: `${di.urgentes} panne(s) urgente(s)`,
        detail: 'À prendre en charge rapidement',
        lien: '/demandes-intervention',
        action: lecture ? undefined : 'Traiter',
      });

    for (const m of this.maintenancesUrgentes()) {
      const e = this.echeance(m.prochaineExecutionDate);
      actions.push({
        niveau: e?.niveau === 'critique' ? 'critique' : 'attention',
        titre: m.typeOperation,
        detail: `${m.vehicule} · ${e?.texte ?? ''}`,
        lien: '/maintenance',
        action: lecture ? undefined : 'Planifier',
      });
    }

    if (d.stock.alertesSeuil > 0)
      actions.push({
        niveau: 'attention',
        titre: `${d.stock.alertesSeuil} pièce(s) sous le seuil`,
        detail: `sur ${d.stock.totalReferences} références en stock`,
        lien: '/stocks',
        action: this.auth.peut('stock.gerer') ? 'Réapprovisionner' : undefined,
      });

    if (d.ordresTravail.enAttente > 0)
      actions.push({
        niveau: 'attention',
        titre: `${d.ordresTravail.enAttente} OT à valider`,
        detail: 'En attente de validation',
        lien: '/ordres-travail',
        action: this.auth.peut('ot.statut') ? 'Valider' : undefined,
      });

    const ordre: Record<Statut, number> = { critique: 0, attention: 1, ok: 2 };
    return actions.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  });

  readonly aFaireAffiche = computed(() => this.aFaire().slice(0, 5));

  // ── Répartition préventif / correctif du mois ─────────────────────────────
  readonly repartition = computed(() => {
    const r = this.data()?.kpis?.repartitionMois;
    const total = (r?.preventif ?? 0) + (r?.correctif ?? 0);
    return {
      preventif: r?.preventif ?? 0,
      correctif: r?.correctif ?? 0,
      total,
      pctPreventif: total ? Math.round(((r?.preventif ?? 0) / total) * 100) : 0,
    };
  });

  // ── Alertes ───────────────────────────────────────────────────────────────
  readonly maintenancesUrgentes = computed(() => {
    const d = this.data();
    if (!d?.prochainesMaintenances) return [];
    const dans14j = new Date();
    dans14j.setDate(dans14j.getDate() + 14);
    return d.prochainesMaintenances.filter(
      (m) => m.prochaineExecutionDate && new Date(m.prochaineExecutionDate) <= dans14j,
    );
  });

  ngOnInit() {
    this.dashboardService.getData().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Échéance d'une maintenance : en retard, proche (≤ 14 j) ou à venir. */
  echeance(date: string | null): { texte: string; niveau: Statut } | null {
    if (!date) return null;
    const jours = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
    if (jours < 0) return { texte: `En retard de ${-jours} j`, niveau: 'critique' };
    if (jours === 0) return { texte: 'Aujourd’hui', niveau: 'attention' };
    if (jours <= 14) return { texte: `Dans ${jours} j`, niveau: 'attention' };
    return { texte: `Dans ${jours} j`, niveau: 'ok' };
  }

  fcfa(montant: number): string {
    const compact = new Intl.NumberFormat('fr-FR', {
      notation: montant >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(montant);
    return `${compact} FCFA`;
  }

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE_VALIDATION: 'Validation',
      PLANIFIE: 'Planifié',
      EN_COURS: 'En cours',
      EN_ATTENTE_PIECES: 'Att. pièces',
      EN_ATTENTE_PRESTATAIRE: 'Att. prest.',
      TERMINE: 'Terminé',
      CONTROLE: 'Contrôle',
      CLOTURE: 'Clôturé',
      ANNULE: 'Annulé',
    };
    return labels[statut] ?? statut;
  }

  statutClass(statut: string): string {
    const classes: Record<string, string> = {
      EN_ATTENTE_VALIDATION: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
      PLANIFIE: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      EN_COURS: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
      EN_ATTENTE_PIECES: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      EN_ATTENTE_PRESTATAIRE: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      TERMINE: 'bg-green-50 text-green-700 ring-green-600/20',
      CONTROLE: 'bg-purple-50 text-purple-700 ring-purple-600/20',
      CLOTURE: 'bg-gray-50 text-gray-600 ring-gray-500/20',
      ANNULE: 'bg-red-50 text-red-700 ring-red-600/20',
    };
    return classes[statut] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20';
  }
}
