import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgClass, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { Vehicule } from '../../../core/models/vehicule.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

import { Action } from '../../../core/auth/permissions';
@Component({
  selector: 'app-vehicules-list',
  standalone: true,
  imports: [CommonModule, NgClass, DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './vehicules-list.component.html',
})
export class VehiculesListComponent implements OnInit {
  /** Bouton visible seulement si l'API autorise l'action pour ce rôle */
  peut(action: Action): boolean {
    return this.auth.peut(action);
  }

  private svc = inject(VehiculesService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  // Même règle que l'API (ADMIN, RESPONSABLE_PARC) ; l'ancienne version autorisait DIRECTION,
  // que l'API refuse, et masquait le bouton au responsable de parc.
  readonly peutCreer = computed(() => this.auth.role() !== null && this.auth.peut('vehicule.creer'));

  entites = signal<string[]>([]);
  vehicules = signal<Vehicule[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  searchTerm = signal('');
  filtreStatut = signal('');
  filtreType = signal('');

  // Modal détail
  vehiculeDetail = signal<Vehicule | null>(null);
  showDetail = signal(false);

  ouvrirDetail(v: Vehicule) {
    this.vehiculeDetail.set(v);
    this.showDetail.set(true);
  }
  fermerDetail() {
    this.showDetail.set(false);
    this.vehiculeDetail.set(null);
  }

  // Modal édition
  vehiculeAEditer = signal<Vehicule | null>(null);
  showEdit = signal(false);
  editLoading = signal(false);
  editErreur = signal('');

  editForm = this.fb.group({
    numeroInterne: ['', Validators.required],
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    typeVehicule: ['', Validators.required],
    numeroSerie: ['', Validators.required],
    annee: [null as number | null],
    carburant: [''],
    couleur: [''],
    kilometrage: [0],
    heuresMoteur: [0],
    dateAcquisition: [''],
    entite: [''],
    departement: [''],
    siteGeographique: [''],
    statut: ['DISPONIBLE'],
    notes: [''],
  });

  ouvrirEdit(v: Vehicule) {
    this.vehiculeAEditer.set(v);
    this.editErreur.set('');
    this.editForm.patchValue({
      numeroInterne: v.numeroInterne,
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      typeVehicule: v.typeVehicule,
      numeroSerie: v.numeroSerie ?? '',
      annee: v.annee ?? null,
      carburant: v.carburant ?? '',
      couleur: v.couleur ?? '',
      kilometrage: v.kilometrage,
      heuresMoteur: v.heuresMoteur,
      dateAcquisition: v.dateAcquisition ? v.dateAcquisition.split('T')[0] : '',
      entite: v.entite ?? '',
      departement: v.departement ?? '',
      siteGeographique: v.siteGeographique ?? '',
      statut: v.statut,
      notes: v.notes ?? '',
    });
    this.showEdit.set(true);
  }
  fermerEdit() {
    this.showEdit.set(false);
    this.vehiculeAEditer.set(null);
  }

  sauvegarderEdit() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.vehiculeAEditer();
    if (!v) return;
    this.editLoading.set(true);
    this.editErreur.set('');
    const data = { ...this.editForm.value } as any;
    if (!data.carburant) delete data.carburant;
    if (!data.dateAcquisition) delete data.dateAcquisition;
    if (!data.annee) delete data.annee;
    this.svc.update(v.id, data).subscribe({
      next: () => {
        this.fermerEdit();
        this.editLoading.set(false);
        this.charger();
        this.chargerSynthese();
        this.toast.success('Véhicule mis à jour');
      },
      error: (err) => {
        this.editLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la modification');
      },
    });
  }

  estEnginHeureEdit(): boolean {
    const t = this.editForm.get('typeVehicule')!.value;
    return t === 'EQUIPEMENT_SPECIAL' || t === 'ENGIN_TP';
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

  // Modal wizard création
  showModal = signal(false);
  etape = signal(1);
  readonly nbEtapes = 3;
  modalLoading = signal(false);
  modalErreur = signal('');

  readonly limit = 15;
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  form = this.fb.group({
    // Étape 1 — Identification
    numeroInterne: ['', Validators.required],
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    typeVehicule: ['', Validators.required],
    numeroSerie: [''],
    // Étape 2 — Caractéristiques
    annee: [null as number | null],
    carburant: [''],
    couleur: [''],
    kilometrage: [0],
    heuresMoteur: [0],
    dateAcquisition: [''],
    // Étape 3 — Affectation
    entite: [''],
    departement: [''],
    siteGeographique: [''],
    statut: ['DISPONIBLE'],
    notes: [''],
  });

  types = [
    { value: 'VOITURE', label: 'Voiture' },
    { value: 'CAMION', label: 'Camion' },
    { value: 'EQUIPEMENT_SPECIAL', label: 'Équipement spécial' },
    { value: 'ENGIN_TP', label: 'Engin TP' },
  ];

  carburants = [
    { value: 'DIESEL', label: 'Diesel' },
    { value: 'ESSENCE', label: 'Essence' },
    { value: 'ELECTRIQUE', label: 'Électrique' },
    { value: 'HYBRIDE', label: 'Hybride' },
    { value: 'GPL', label: 'GPL' },
  ];

  statuts = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'EN_CIRCULATION', label: 'En circulation' },
    { value: 'EN_MAINTENANCE', label: 'En maintenance' },
    { value: 'EN_ATTENTE_REPARATION_EXTERNE', label: 'Att. réparation ext.' },
    { value: 'EN_ATTENTE_PIECES', label: 'Att. pièces' },
    { value: 'IMMOBILISE', label: 'Immobilisé' },
    { value: 'ACCIDENTE', label: 'Accidenté' },
    { value: 'HORS_SERVICE', label: 'Hors service' },
  ];

  readonly etapes = [
    { num: 1, titre: 'Identification' },
    { num: 2, titre: 'Caractéristiques' },
    { num: 3, titre: 'Affectation' },
  ];

  // Champs obligatoires par étape
  private readonly champEtape1 = [
    'numeroInterne',
    'immatriculation',
    'marque',
    'modele',
    'typeVehicule',
  ];

  ngOnInit() {
    this.charger();
    this.chargerSynthese();
    this.svc.getEntites().subscribe((e) => this.entites.set(e));
  }

  charger() {
    this.loading.set(true);
    this.svc
      .getAll({
        page: this.page(),
        limit: this.limit,
        statut: this.filtreStatut() || undefined,
        typeVehicule: this.filtreType() || undefined,
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.vehicules.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private searchTimer: any;
  onSearch(e: Event) {
    clearTimeout(this.searchTimer);
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.page.set(1);
    this.searchTimer = setTimeout(() => this.charger(), 350);
  }

  onStatutChange(e: Event) {
    this.filtreStatut.set((e.target as HTMLSelectElement).value);
    this.page.set(1);
    this.charger();
  }

  onTypeChange(e: Event) {
    this.filtreType.set((e.target as HTMLSelectElement).value);
    this.page.set(1);
    this.charger();
  }

  goPage(p: number) {
    this.page.set(p);
    this.charger();
  }

  ouvrirModal() {
    this.form.reset({ statut: 'DISPONIBLE', kilometrage: 0, heuresMoteur: 0 });
    this.etape.set(1);
    this.modalErreur.set('');
    this.showModal.set(true);
  }

  fermerModal() {
    this.showModal.set(false);
  }

  supprimer(v: Vehicule) {
    this.demanderConfirmation(
      `Supprimer le véhicule ${v.immatriculation} — ${v.marque} ${v.modele} ? Cette action est irréversible.`,
      () =>
        this.svc.delete(v.id).subscribe({
          next: () => {
            this.charger();
            this.chargerSynthese();
          },
        }),
    );
  }

  suivant() {
    if (this.etape() === 1) {
      this.champEtape1.forEach((f) => this.form.get(f)!.markAsTouched());
      const invalides = this.champEtape1.some((f) => this.form.get(f)!.invalid);
      if (invalides) return;
    }
    this.etape.update((e) => Math.min(e + 1, this.nbEtapes));
  }

  precedent() {
    this.etape.update((e) => Math.max(e - 1, 1));
  }

  touched(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  soumettre() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalLoading.set(true);
    this.modalErreur.set('');
    const data = { ...this.form.value } as any;
    if (!data.carburant) delete data.carburant;
    if (!data.dateAcquisition) delete data.dateAcquisition;
    if (!data.annee) delete data.annee;
    this.svc.create(data).subscribe({
      next: () => {
        this.fermerModal();
        this.modalLoading.set(false);
        this.charger();
        this.chargerSynthese();
        this.toast.success('Véhicule créé avec succès');
      },
      error: (err) => {
        this.modalLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la création');
      },
    });
  }

  estEnginHeure(): boolean {
    const t = this.form.get('typeVehicule')!.value;
    return t === 'EQUIPEMENT_SPECIAL' || t === 'ENGIN_TP';
  }

  typeLabel(t: string): string {
    return this.types.find((x) => x.value === t)?.label ?? t;
  }
  statutLabel(s: string): string {
    return this.statuts.find((x) => x.value === s)?.label ?? s;
  }

  statutClass(s: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'bg-green-50 text-green-700 ring-green-600/20',
      EN_CIRCULATION: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      EN_MAINTENANCE: 'bg-amber-50 text-amber-800 ring-amber-600/25',
      EN_ATTENTE_REPARATION_EXTERNE: 'bg-amber-50 text-amber-800 ring-amber-600/25',
      EN_ATTENTE_PIECES: 'bg-amber-50 text-amber-800 ring-amber-600/25',
      IMMOBILISE: 'bg-red-50 text-red-700 ring-red-600/20',
      ACCIDENTE: 'bg-red-50 text-red-700 ring-red-600/20',
      HORS_SERVICE: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    };
    return m[s] ?? 'bg-gray-100 text-gray-600 ring-gray-500/20';
  }

  statutPoint(s: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'bg-green-500',
      EN_CIRCULATION: 'bg-blue-500',
      EN_MAINTENANCE: 'bg-amber-500',
      EN_ATTENTE_REPARATION_EXTERNE: 'bg-amber-500',
      EN_ATTENTE_PIECES: 'bg-amber-500',
      IMMOBILISE: 'bg-red-500',
      ACCIDENTE: 'bg-red-500',
      HORS_SERVICE: 'bg-gray-400',
    };
    return m[s] ?? 'bg-gray-400';
  }

  // ── Synthèse du parc (indépendante des filtres) ───────────────────────────
  readonly parcComplet = signal<Vehicule[]>([]);
  readonly comptesStatut = computed(() => {
    const c: Record<string, number> = {};
    for (const v of this.parcComplet()) c[v.statut] = (c[v.statut] ?? 0) + 1;
    return c;
  });
  readonly statutsPresents = computed(() => this.statuts.filter((s) => this.comptesStatut()[s.value]));
  readonly synthese = computed(() => {
    const c = this.comptesStatut();
    const total = this.parcComplet().length;
    const operationnels = (c['DISPONIBLE'] ?? 0) + (c['EN_CIRCULATION'] ?? 0);
    const enAtelier = (c['EN_MAINTENANCE'] ?? 0) + (c['EN_ATTENTE_REPARATION_EXTERNE'] ?? 0) + (c['EN_ATTENTE_PIECES'] ?? 0);
    const arret = (c['IMMOBILISE'] ?? 0) + (c['ACCIDENTE'] ?? 0) + (c['HORS_SERVICE'] ?? 0);
    return { total, operationnels, enAtelier, arret, taux: total ? Math.round((operationnels / total) * 100) : 0 };
  });

  readonly filtresActifs = computed(() => !!this.searchTerm() || !!this.filtreStatut() || !!this.filtreType());

  choisirStatut(valeur: string) {
    this.filtreStatut.set(this.filtreStatut() === valeur ? '' : valeur);
    this.page.set(1);
    this.charger();
  }

  reinitialiserFiltres() {
    this.searchTerm.set('');
    this.filtreStatut.set('');
    this.filtreType.set('');
    this.page.set(1);
    this.charger();
  }

  private chargerSynthese() {
    this.svc.getAll({ page: 1, limit: 500 }).subscribe({ next: (r) => this.parcComplet.set(r.data) });
  }
}
