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
  etape = signal(1);
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

  // ── Wizard création ──────────────────────────────────────────────
  ouvrirModal() {
    this.form.reset({ typeMaintenance: 'CORRECTIVE' });
    this.erreurModal.set('');
    this.etape.set(1);
    this.showModal.set(true);
  }
  fermerModal() {
    this.showModal.set(false);
  }

  suivant() {
    const ctrl = this.form.get('vehiculeId');
    ctrl?.markAsTouched();
    if (ctrl?.invalid) return;
    this.etape.set(2);
  }
  precedent() {
    this.etape.set(1);
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
      })
      .subscribe({
        next: () => {
          this.fermerModal();
          this.charger();
          this.modalLoading.set(false);
        },
        error: (err) => {
          this.erreurModal.set(err?.error?.message ?? 'Erreur');
          this.modalLoading.set(false);
        },
      });
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
