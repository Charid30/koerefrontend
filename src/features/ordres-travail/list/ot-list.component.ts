import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OtService } from '../../../core/services/ot.service';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { ToastService } from '../../../core/services/toast.service';
import { OrdreTravail } from '../../../core/models/ot.model';
import { Vehicule } from '../../../core/models/vehicule.model';
import { OT_STATUT_LABELS, OT_STATUT_CLASSES, OT_STATUT_POINTS, OT_TRANSITIONS } from '../ot.constants';

@Component({
  selector: 'app-ot-list',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ot-list.component.html',
})
export class OtListComponent implements OnInit {
  private svc = inject(OtService);
  private vehiculesSvc = inject(VehiculesService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  ots = signal<OrdreTravail[]>([]);
  total = signal(0);
  page = signal(1);
  filtreStatut = signal('');
  recherche = signal('');
  loading = signal(true);
  readonly limit = 15;
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  filtreType = signal<'' | 'PREVENTIVE' | 'CORRECTIVE'>('');

  otsFiltres = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    const type = this.filtreType();
    return this.ots().filter((ot) => !type || ot.typeMaintenance === type).filter(
      (ot) =>
        !q ||
        ot.numeroOT.toLowerCase().includes(q) ||
        `${ot.vehicule?.marque ?? ''} ${ot.vehicule?.modele ?? ''}`.toLowerCase().includes(q) ||
        (ot.vehicule?.immatriculation ?? '').toLowerCase().includes(q) ||
        (ot.vehicule?.numeroInterne ?? '').toLowerCase().includes(q) ||
        (ot.vehicule?.numeroSerie ?? '').toLowerCase().includes(q),
    );
  });

  // ── Synthèse (tous les OT, indépendante des filtres) ─────────────────────
  readonly tousOts = signal<OrdreTravail[]>([]);
  readonly comptesStatut = computed(() => {
    const c: Record<string, number> = {};
    for (const o of this.tousOts()) c[o.statut] = (c[o.statut] ?? 0) + 1;
    return c;
  });
  readonly statutsPresents = computed(() => this.statuts.filter((s) => this.comptesStatut()[s.value]));
  readonly synthese = computed(() => {
    const c = this.comptesStatut();
    const ots = this.tousOts();
    return {
      total: ots.length,
      aValider: c['EN_ATTENTE_VALIDATION'] ?? 0,
      enCours: (c['EN_COURS'] ?? 0) + (c['EN_ATTENTE_PIECES'] ?? 0) + (c['EN_ATTENTE_PRESTATAIRE'] ?? 0),
      cout: ots.reduce((s, o: any) => s + Number(o.coutPiecesTotal ?? 0) + Number(o.coutPrestataire ?? 0), 0),
    };
  });
  readonly filtresActifs = computed(() => !!this.recherche() || !!this.filtreStatut() || !!this.filtreType());

  choisirStatut(valeur: string) {
    this.filtrerStatut(this.filtreStatut() === valeur ? '' : valeur);
  }

  reinitialiserFiltres() {
    this.recherche.set('');
    this.filtreType.set('');
    this.filtrerStatut('');
  }

  statutPoint(s: string): string {
    return OT_STATUT_POINTS[s] ?? 'bg-gray-400';
  }

  fcfa(montant: number): string {
    return `${new Intl.NumberFormat('fr-FR', { notation: montant >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(montant)} FCFA`;
  }

  statuts = Object.entries(OT_STATUT_LABELS).map(([value, label]) => ({ value, label }));

  // Modal wizard création
  showModal = signal(false);
  modalLoading = signal(false);
  erreurModal = signal('');
  vehicules = signal<Vehicule[]>([]);

  // Modal détail
  otDetail = signal<OrdreTravail | null>(null);
  showDetail = signal(false);
  detailLoading = signal(false);
  actionLoading = signal(false);
  erreurAction = signal('');

  transitionsDisponibles = computed(() => {
    const statut = this.otDetail()?.statut;
    return statut ? (OT_TRANSITIONS[statut] ?? []) : [];
  });

  form = this.fb.group({
    vehiculeId: ['', Validators.required],
    typeMaintenance: ['CORRECTIVE', Validators.required],
    datePlanifiee: [''],
    prestatireExterne: [''],
    description: [''],
  });

  ngOnInit() {
    this.charger();
    this.vehiculesSvc.getAll({ limit: 200 }).subscribe({ next: (r) => this.vehicules.set(r.data) });
  }

  charger() {
    this.loading.set(true);
    this.svc.getAll({ page: 1, limit: 500 }).subscribe({ next: (r) => this.tousOts.set(r.data) });
    this.svc
      .getAll({ statut: this.filtreStatut() || undefined, page: this.page(), limit: this.limit })
      .subscribe({
        next: (r) => {
          this.ots.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  filtrerStatut(s: string) {
    this.filtreStatut.set(s);
    this.page.set(1);
    this.charger();
  }
  goPage(p: number) {
    this.page.set(p);
    this.charger();
  }

  // ── Détail modal ────────────────────────────────────────────────
  ouvrirDetail(ot: OrdreTravail) {
    this.otDetail.set(ot);
    this.showDetail.set(true);
    this.erreurAction.set('');
    this.detailLoading.set(true);
    this.svc.getOne(ot.id).subscribe({
      next: (full) => {
        this.otDetail.set(full);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  fermerDetail() {
    this.showDetail.set(false);
    this.otDetail.set(null);
  }

  changerStatut(statut: string) {
    const ot = this.otDetail();
    if (!ot) return;
    this.actionLoading.set(true);
    this.erreurAction.set('');
    this.svc.updateStatut(ot.id, statut).subscribe({
      next: (updated) => {
        this.otDetail.set({ ...this.otDetail()!, statut: updated.statut });
        this.actionLoading.set(false);
        this.charger();
      },
      error: (err) => {
        this.erreurAction.set(err?.error?.message ?? 'Impossible de changer le statut.');
        this.actionLoading.set(false);
      },
    });
  }

  transitionClass(statut: string): string {
    if (['ANNULE'].includes(statut)) return 'border-red-200 text-red-700 hover:bg-red-50';
    if (['CLOTURE', 'TERMINE'].includes(statut))
      return 'border-green-200 text-green-700 hover:bg-green-50';
    return 'border-primary-200 text-primary-700 hover:bg-primary-50';
  }

  // Modal édition
  otAEditer = signal<OrdreTravail | null>(null);
  showEdit = signal(false);
  editLoading = signal(false);
  editErreur = signal('');

  editForm = this.fb.group({
    typeMaintenance: ['CORRECTIVE'],
    datePlanifiee: [''],
    prestatireExterne: [''],
    description: [''],
  });

  ouvrirEdit(ot: OrdreTravail) {
    this.otAEditer.set(ot);
    this.editErreur.set('');
    this.editForm.patchValue({
      typeMaintenance: ot.typeMaintenance ?? 'CORRECTIVE',
      datePlanifiee: ot.datePlanifiee ? ot.datePlanifiee.split('T')[0] : '',
      prestatireExterne: ot.prestatireExterne ?? '',
      description: ot.description ?? '',
    });
    this.showEdit.set(true);
  }
  fermerEdit() {
    this.showEdit.set(false);
    this.otAEditer.set(null);
  }

  sauvegarderEdit() {
    const ot = this.otAEditer();
    if (!ot) return;
    this.editLoading.set(true);
    this.editErreur.set('');
    const val = this.editForm.value as any;
    this.svc
      .update(ot.id, {
        typeMaintenance: val.typeMaintenance,
        datePlanifiee: val.datePlanifiee || undefined,
        prestatireExterne: val.prestatireExterne || undefined,
        description: val.description || undefined,
      })
      .subscribe({
        next: () => {
          this.fermerEdit();
          this.editLoading.set(false);
          this.charger();
        },
        error: (err) => {
          this.editErreur.set(err?.error?.message ?? 'Erreur');
          this.editLoading.set(false);
        },
      });
  }

  // Modal confirmation
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

  // ── Suppression ─────────────────────────────────────────────────
  supprimerOt(ot: OrdreTravail) {
    this.demanderConfirmation(
      `Supprimer l'OT ${ot.numeroOT} ? Cette action est irréversible.`,
      () => this.svc.delete(ot.id).subscribe({ next: () => this.charger() }),
    );
  }

  // ── Création d'un OT ─────────────────────────────────────────────
  readonly rechercheVehicule = signal('');
  readonly vehiculeChoisiId = signal<number | null>(null);

  readonly vehiculesFiltres = computed(() => {
    const q = this.rechercheVehicule().toLowerCase().trim();
    if (!q) return this.vehicules();
    return this.vehicules().filter((v) =>
      `${v.marque} ${v.modele} ${v.numeroInterne} ${v.immatriculation}`.toLowerCase().includes(q),
    );
  });

  readonly vehiculeChoisi = computed(
    () => this.vehicules().find((v) => v.id === this.vehiculeChoisiId()) ?? null,
  );

  /** Raccourcis de date de planification */
  readonly datesRapides = [
    { libelle: 'Aujourd’hui', jours: 0 },
    { libelle: 'Demain', jours: 1 },
    { libelle: 'Dans une semaine', jours: 7 },
  ];

  ouvrirModal() {
    this.form.reset({
      vehiculeId: '',
      typeMaintenance: 'CORRECTIVE',
      datePlanifiee: '',
      prestatireExterne: '',
      description: '',
    });
    this.rechercheVehicule.set('');
    this.vehiculeChoisiId.set(null);
    this.erreurModal.set('');
    this.showModal.set(true);
  }
  fermerModal() {
    this.showModal.set(false);
  }

  choisirVehicule(id: number) {
    this.vehiculeChoisiId.set(id);
    this.form.get('vehiculeId')!.setValue(String(id));
  }

  dateDans(jours: number): string {
    const d = new Date();
    d.setDate(d.getDate() + jours);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  choisirDate(jours: number) {
    this.form.get('datePlanifiee')!.setValue(this.dateDans(jours));
  }

  soumettre() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalLoading.set(true);
    this.erreurModal.set('');
    const val = this.form.value as any;
    this.svc
      .create({
        ...val,
        vehiculeId: Number(val.vehiculeId),
        datePlanifiee: val.datePlanifiee || undefined,
        prestatireExterne: val.prestatireExterne || undefined,
        description: val.description || undefined,
      })
      .subscribe({
        next: () => {
          this.fermerModal();
          this.charger();
          this.modalLoading.set(false);
          this.toast.success('Ordre de travail créé');
        },
        error: (err) => {
          this.erreurModal.set(err?.error?.message ?? 'La création a échoué. Réessayez.');
          this.modalLoading.set(false);
        },
      });
  }

  statutVehiculeLabel(s: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'Disponible',
      EN_CIRCULATION: 'En circulation',
      EN_MAINTENANCE: 'En maintenance',
      EN_ATTENTE_REPARATION_EXTERNE: 'Réparation ext.',
      EN_ATTENTE_PIECES: 'Attente pièces',
      IMMOBILISE: 'Immobilisé',
      ACCIDENTE: 'Accidenté',
      HORS_SERVICE: 'Hors service',
    };
    return m[s] ?? s;
  }

  statutVehiculeClass(s: string): string {
    if (s === 'DISPONIBLE') return 'bg-green-50 text-green-700 ring-green-600/20';
    if (s === 'EN_CIRCULATION') return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    if (['IMMOBILISE', 'ACCIDENTE'].includes(s)) return 'bg-red-50 text-red-700 ring-red-600/20';
    if (s === 'HORS_SERVICE') return 'bg-gray-100 text-gray-600 ring-gray-500/20';
    return 'bg-amber-50 text-amber-800 ring-amber-600/25';
  }

  setType(t: string) {
    this.form.get('typeMaintenance')!.setValue(t);
  }

  statutLabel(s: string) {
    return OT_STATUT_LABELS[s] ?? s;
  }
  statutClass(s: string) {
    return OT_STATUT_CLASSES[s] ?? 'bg-gray-100 text-gray-600';
  }
}
