import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MaintenanceService, PlanMaintenance } from '../../../core/services/maintenance.service';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { ToastService } from '../../../core/services/toast.service';
import { Vehicule } from '../../../core/models/vehicule.model';

type Onglet = 'periodique' | 'generale';

import { AuthService } from '../../../core/services/auth.service';
import { Action } from '../../../core/auth/permissions';
@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './maintenance-list.component.html',
})
export class MaintenanceListComponent implements OnInit {
  private readonly authPermissions = inject(AuthService);
  /** Bouton visible seulement si l'API autorise l'action pour ce rôle */
  peut(action: Action): boolean {
    return this.authPermissions.peut(action);
  }

  private svc = inject(MaintenanceService);
  private vSvc = inject(VehiculesService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  onglet = signal<Onglet>('periodique');
  periodiques = signal<PlanMaintenance[]>([]);
  generales = signal<PlanMaintenance[]>([]);
  vehicules = signal<Vehicule[]>([]);
  loading = signal(true);

  // ── Modal ajout ────────────────────────────────────────────────────
  showModal = signal(false);
  modalLoading = signal(false);

  formPeriodique = this.fb.group({
    vehiculeId: [null as number | null, Validators.required],
    derniereExecutionKm: [null as number | null],
    description: [''],
  });

  formGenerale = this.fb.group({
    vehiculeId: [null as number | null, Validators.required],
    frequenceMois: [null as number | null, [Validators.required, Validators.min(1)]],
    derniereExecutionDate: [''],
    description: [''],
  });

  // Recherche véhicule dans le modal
  rechercheVehicule = signal('');
  showVehiculeResults = signal(false);
  vehiculeSelectionne = signal<Vehicule | null>(null);

  vehiculesFiltres = computed(() => {
    const q = this.rechercheVehicule().toLowerCase().trim();
    const list = this.vehicules();
    if (!q) return list.slice(0, 8);
    return list
      .filter(
        (v) =>
          v.immatriculation.toLowerCase().includes(q) ||
          v.numeroInterne.toLowerCase().includes(q) ||
          `${v.marque} ${v.modele}`.toLowerCase().includes(q),
      )
      .slice(0, 10);
  });

  selectionnerVehicule(v: Vehicule) {
    this.vehiculeSelectionne.set(v);
    const id = v.id;
    this.formPeriodique.get('vehiculeId')!.setValue(id);
    this.formGenerale.get('vehiculeId')!.setValue(id);
    // Pré-remplir km courant pour périodique
    if (this.onglet() === 'periodique') {
      this.formPeriodique.get('derniereExecutionKm')!.setValue(v.kilometrage);
    }
    this.rechercheVehicule.set('');
    this.showVehiculeResults.set(false);
  }

  ouvrirModal() {
    this.showModal.set(true);
    this.formPeriodique.reset();
    this.formGenerale.reset();
    this.vehiculeSelectionne.set(null);
    this.rechercheVehicule.set('');
    this.showVehiculeResults.set(false);
  }
  fermerModal() {
    this.showModal.set(false);
  }

  soumettre() {
    if (this.onglet() === 'periodique') {
      if (this.formPeriodique.invalid) {
        this.formPeriodique.markAllAsTouched();
        return;
      }
      const v = this.formPeriodique.value;
      this.modalLoading.set(true);
      this.svc
        .create({
          vehiculeId: v.vehiculeId!,
          typePlan: 'PERIODIQUE',
          derniereExecutionKm: v.derniereExecutionKm ?? undefined,
          description: v.description || undefined,
        })
        .subscribe({
          next: () => {
            this.fermerModal();
            this.modalLoading.set(false);
            this.charger();
            this.toast.success('Véhicule inscrit en maintenance périodique');
          },
          error: (e) => {
            this.modalLoading.set(false);
            this.toast.error(e?.error?.message ?? 'Erreur');
          },
        });
    } else {
      if (this.formGenerale.invalid) {
        this.formGenerale.markAllAsTouched();
        return;
      }
      const v = this.formGenerale.value;
      this.modalLoading.set(true);
      this.svc
        .create({
          vehiculeId: v.vehiculeId!,
          typePlan: 'GENERALE',
          frequenceMois: v.frequenceMois!,
          derniereExecutionDate: v.derniereExecutionDate || undefined,
          description: v.description || undefined,
        })
        .subscribe({
          next: () => {
            this.fermerModal();
            this.modalLoading.set(false);
            this.charger();
            this.toast.success('Véhicule inscrit en maintenance générale');
          },
          error: (e) => {
            this.modalLoading.set(false);
            this.toast.error(e?.error?.message ?? 'Erreur');
          },
        });
    }
  }

  // ── Marquer effectuée ──────────────────────────────────────────────
  showExecution = signal(false);
  planExecution = signal<PlanMaintenance | null>(null);
  kmExecution = signal(0);
  execLoading = signal(false);

  ouvrirExecution(p: PlanMaintenance) {
    this.planExecution.set(p);
    this.kmExecution.set(p.vehicule?.kilometrage ?? 0);
    this.showExecution.set(true);
  }
  fermerExecution() {
    this.showExecution.set(false);
    this.planExecution.set(null);
  }

  validerExecution() {
    const p = this.planExecution();
    if (!p) return;
    this.execLoading.set(true);
    const km = p.typePlan === 'PERIODIQUE' ? this.kmExecution() : undefined;
    this.svc.marquerEffectuee(p.id, km).subscribe({
      next: () => {
        this.fermerExecution();
        this.execLoading.set(false);
        this.charger();
        this.toast.success('Maintenance enregistrée — cycle remis à zéro');
      },
      error: () => {
        this.execLoading.set(false);
        this.toast.error("Erreur lors de l'enregistrement");
      },
    });
  }

  // ── Suppression ────────────────────────────────────────────────────
  confirmMsg = signal('');
  confirmAction = signal<(() => void) | null>(null);
  showConfirm = signal(false);

  demanderConfirmation(msg: string, action: () => void) {
    this.confirmMsg.set(msg);
    this.confirmAction.set(action);
    this.showConfirm.set(true);
  }
  annulerConfirm() {
    this.showConfirm.set(false);
    this.confirmAction.set(null);
  }
  validerConfirm() {
    const fn = this.confirmAction();
    if (fn) fn();
    this.showConfirm.set(false);
    this.confirmAction.set(null);
  }

  retirer(p: PlanMaintenance) {
    this.demanderConfirmation(
      `Retirer ${p.vehicule?.immatriculation} du programme de maintenance ?`,
      () =>
        this.svc.desactiver(p.id).subscribe({
          next: () => {
            this.charger();
            this.toast.success('Véhicule retiré');
          },
        }),
    );
  }

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit() {
    this.vSvc.getAll({ limit: 200 }).subscribe({ next: (r) => this.vehicules.set(r.data) });
    this.charger();
  }

  charger() {
    this.loading.set(true);
    this.svc.getPeriodique().subscribe({ next: (p) => this.periodiques.set(p) });
    this.svc.getGenerale().subscribe({
      next: (g) => {
        this.generales.set(g);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setOnglet(o: Onglet) {
    this.onglet.set(o);
  }

  // ── Calculs d'état ────────────────────────────────────────────────

  /** % parcouru depuis dernier entretien vers seuil 10 000 km */
  progressKm(p: PlanMaintenance): number {
    const kmActuel = p.vehicule?.kilometrage ?? 0;
    const kmDepart = p.derniereExecutionKm ?? 0;
    const seuil = p.frequenceKm ?? 10_000;
    const parcouru = Math.max(0, kmActuel - kmDepart);
    return Math.min(100, Math.round((parcouru / seuil) * 100));
  }

  kmRestant(p: PlanMaintenance): number {
    const kmActuel = p.vehicule?.kilometrage ?? 0;
    return Math.max(0, (p.prochaineExecutionKm ?? 0) - kmActuel);
  }

  alerteKm(p: PlanMaintenance): boolean {
    return (p.vehicule?.kilometrage ?? 0) >= (p.prochaineExecutionKm ?? Infinity);
  }

  /** Jours restants avant maintenance générale */
  joursRestants(p: PlanMaintenance): number {
    if (!p.prochaineExecutionDate) return 999;
    return Math.round((new Date(p.prochaineExecutionDate).getTime() - Date.now()) / 86_400_000);
  }

  /** % du temps écoulé dans le cycle général */
  progressMois(p: PlanMaintenance): number {
    if (!p.derniereExecutionDate || !p.frequenceMois) return 0;
    const debut = new Date(p.derniereExecutionDate).getTime();
    const fin = new Date(p.prochaineExecutionDate!).getTime();
    const ecoule = Date.now() - debut;
    return Math.min(100, Math.round((ecoule / (fin - debut)) * 100));
  }

  alerteGenerale(p: PlanMaintenance): boolean {
    return this.joursRestants(p) <= 0;
  }

  statutKm(p: PlanMaintenance): 'ok' | 'proche' | 'alerte' {
    const pct = this.progressKm(p);
    if (pct >= 100) return 'alerte';
    if (pct >= 80) return 'proche';
    return 'ok';
  }

  statutMois(p: PlanMaintenance): 'ok' | 'proche' | 'alerte' {
    const j = this.joursRestants(p);
    if (j <= 0) return 'alerte';
    if (j <= 15) return 'proche';
    return 'ok';
  }

  barreClass(statut: 'ok' | 'proche' | 'alerte'): string {
    return { ok: 'bg-green-500', proche: 'bg-amber-400', alerte: 'bg-red-500' }[statut];
  }

  badgeClass(statut: 'ok' | 'proche' | 'alerte'): string {
    return {
      ok: 'bg-green-50 text-green-700 ring-green-600/20',
      proche: 'bg-amber-50 text-amber-800 ring-amber-600/25',
      alerte: 'bg-red-50 text-red-700 ring-red-600/20',
    }[statut];
  }

  badgeLabel(statut: 'ok' | 'proche' | 'alerte'): string {
    return { ok: 'À jour', proche: 'Bientôt', alerte: 'Maintenance requise' }[statut];
  }

  statutPlan(p: PlanMaintenance): 'ok' | 'proche' | 'alerte' {
    return p.frequenceMois && !p.frequenceKm ? this.statutMois(p) : this.statutKm(p);
  }

  // ── Synthèse et tri par urgence ──────────────────────────────────────────
  private readonly ordreUrgence = { alerte: 0, proche: 1, ok: 2 } as const;

  readonly periodiquesTries = computed(() =>
    [...this.periodiques()].sort(
      (a, b) => this.ordreUrgence[this.statutKm(a)] - this.ordreUrgence[this.statutKm(b)] || this.kmRestant(a) - this.kmRestant(b),
    ),
  );

  readonly generalesTriees = computed(() =>
    [...this.generales()].sort(
      (a, b) => this.ordreUrgence[this.statutMois(a)] - this.ordreUrgence[this.statutMois(b)] || this.joursRestants(a) - this.joursRestants(b),
    ),
  );

  readonly synthese = computed(() => {
    const etats = [...this.periodiques().map((p) => this.statutKm(p)), ...this.generales().map((p) => this.statutMois(p))];
    return {
      total: etats.length,
      ok: etats.filter((e) => e === 'ok').length,
      proche: etats.filter((e) => e === 'proche').length,
      alerte: etats.filter((e) => e === 'alerte').length,
    };
  });
}
