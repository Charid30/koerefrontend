import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, NgClass, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DiService } from '../../../core/services/di.service';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { DemandeIntervention } from '../../../core/models/ot.model';
import { Vehicule } from '../../../core/models/vehicule.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-di-list',
  standalone: true,
  imports: [CommonModule, NgClass, DatePipe, ReactiveFormsModule],
  templateUrl: './di-list.component.html',
})
export class DiListComponent implements OnInit {
  private svc = inject(DiService);
  private vehiculesSvc = inject(VehiculesService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  dis = signal<DemandeIntervention[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  readonly limit = 15;
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  // Filtres
  filtreStatut   = signal('');
  filtrePriorite = signal('');
  recherche      = signal('');

  disFiltres = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    if (!q) return this.dis();
    return this.dis().filter(di =>
      di.numeroDI.toLowerCase().includes(q) ||
      `${di.vehicule?.marque ?? ''} ${di.vehicule?.modele ?? ''}`.toLowerCase().includes(q) ||
      (di.vehicule?.numeroInterne ?? '').toLowerCase().includes(q) ||
      (di.vehicule?.numeroSerie ?? '').toLowerCase().includes(q) ||
      di.description.toLowerCase().includes(q)
    );
  });

  // Modal détail
  diDetail   = signal<DemandeIntervention | null>(null);
  showDetail = signal(false);

  ouvrirDetail(di: DemandeIntervention) { this.diDetail.set(di); this.showDetail.set(true); }
  fermerDetail() { this.showDetail.set(false); this.diDetail.set(null); }

  // Modal édition
  diAEditer  = signal<DemandeIntervention | null>(null);
  showEdit   = signal(false);
  editLoad   = signal(false);
  editErr    = signal('');

  editForm = this.fb.group({
    description:  ['', [Validators.required, Validators.minLength(10)]],
    priorite:     ['NORMALE', Validators.required],
    localisation: [''],
    statut:       [''],
  });

  ouvrirEdit(di: DemandeIntervention) {
    this.diAEditer.set(di);
    this.editErr.set('');
    this.editForm.patchValue({
      description:  di.description,
      priorite:     di.priorite,
      localisation: di.localisation ?? '',
      statut:       di.statut,
    });
    this.showEdit.set(true);
  }
  fermerEdit() { this.showEdit.set(false); this.diAEditer.set(null); }

  sauvegarderEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const di = this.diAEditer();
    if (!di) return;
    this.editLoad.set(true);
    this.editErr.set('');
    const val = this.editForm.value as any;
    const statutCourant = di.statut;
    const nouveauStatut = val.statut;

    const update$ = this.svc.update(di.id, {
      description: val.description,
      priorite: val.priorite,
      localisation: val.localisation || undefined,
    });
    update$.subscribe({
      next: () => {
        if (nouveauStatut !== statutCourant) {
          this.svc.updateStatut(di.id, nouveauStatut).subscribe({
            next: () => { this.fermerEdit(); this.editLoad.set(false); this.charger(); },
            error: () => { this.fermerEdit(); this.editLoad.set(false); this.charger(); },
          });
        } else {
          this.fermerEdit();
          this.editLoad.set(false);
          this.charger();
        }
      },
      error: err => { this.editErr.set(err?.error?.message ?? 'Erreur lors de la modification.'); this.editLoad.set(false); },
    });
  }

  // Modal confirmation
  confirmMsg    = signal('');
  confirmAction = signal<(() => void) | null>(null);
  showConfirm   = signal(false);

  demanderConfirmation(msg: string, action: () => void) { this.confirmMsg.set(msg); this.confirmAction.set(action); this.showConfirm.set(true); }
  annulerConfirm() { this.showConfirm.set(false); this.confirmAction.set(null); }
  validerConfirm() { const fn = this.confirmAction(); if (fn) fn(); this.showConfirm.set(false); this.confirmAction.set(null); }

  supprimer(di: DemandeIntervention) {
    this.demanderConfirmation(
      `Supprimer la DI ${di.numeroDI} ? Cette action est irréversible.`,
      () => this.svc.delete(di.id).subscribe({ next: () => this.charger() })
    );
  }

  readonly peutSupprimer = computed(() => ['ADMIN', 'RESPONSABLE_PARC'].includes(this.role() ?? ''));

  // Modal création
  showModal = signal(false);
  modalLoading = signal(false);
  erreurModal = signal('');
  vehicules = signal<Vehicule[]>([]);
  etape = signal(1);

  readonly role = this.auth.role;
  readonly peutCreer = computed(() =>
    ['ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN','CHAUFFEUR'].includes(this.role() ?? '')
  );
  readonly peutChangerStatut = computed(() =>
    ['ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE'].includes(this.role() ?? '')
  );

  form = this.fb.group({
    vehiculeId: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    priorite: ['NORMALE', Validators.required],
    localisation: [''],
  });

  readonly PRIORITE_LABELS: Record<string, string> = {
    FAIBLE: 'Faible', NORMALE: 'Normale', URGENTE: 'Urgente', CRITIQUE: 'Critique',
  };
  readonly STATUT_LABELS: Record<string, string> = {
    EN_ATTENTE: 'En attente', PRISE_EN_CHARGE: 'Prise en charge', TRAITEE: 'Traitée', REJETEE: 'Rejetée',
  };

  ngOnInit() {
    this.charger();
    this.vehiculesSvc.getAll({ limit: 200 }).subscribe({
      next: r => this.vehicules.set(r.data),
    });
  }

  charger() {
    this.loading.set(true);
    this.svc.getAll({
      statut: this.filtreStatut() || undefined,
      priorite: this.filtrePriorite() || undefined,
      page: this.page(),
      limit: this.limit,
    }).subscribe({
      next: r => { this.dis.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filtrer(statut: string, priorite: string) {
    this.filtreStatut.set(statut);
    this.filtrePriorite.set(priorite);
    this.page.set(1);
    this.charger();
  }

  goPage(p: number) { this.page.set(p); this.charger(); }

  // Géolocalisation
  geoLoading = signal(false);
  geoErreur  = signal('');

  geoLocaliser() {
    if (!navigator.geolocation) { this.geoErreur.set('Géolocalisation non supportée par ce navigateur'); return; }
    this.geoLoading.set(true);
    this.geoErreur.set('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`)
          .then(r => r.json())
          .then(data => {
            const a = data.address ?? {};
            const parts = [
              a.road ?? a.pedestrian ?? a.footway,
              a.suburb ?? a.neighbourhood ?? a.quarter,
              a.city ?? a.town ?? a.village ?? a.municipality,
            ].filter(Boolean);
            const adresse = parts.length ? parts.join(', ') : data.display_name?.split(',').slice(0,3).join(',').trim();
            this.form.get('localisation')!.setValue(adresse ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
            this.geoLoading.set(false);
          })
          .catch(() => {
            this.form.get('localisation')!.setValue(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
            this.geoLoading.set(false);
          });
      },
      err => {
        const msgs: Record<number, string> = {
          1: 'Permission refusée — autorisez la localisation dans votre navigateur',
          2: 'Position indisponible',
          3: 'Délai expiré',
        };
        this.geoErreur.set(msgs[err.code] ?? 'Erreur de géolocalisation');
        this.geoLoading.set(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  // Recherche véhicule dans le modal
  rechercheVehicule  = signal('');
  showVehiculeResults = signal(false);
  vehiculeSelectionne = signal<Vehicule | null>(null);

  vehiculesFiltres = computed(() => {
    const q = this.rechercheVehicule().toLowerCase().trim();
    const list = this.vehicules();
    if (!q) return list.slice(0, 8);
    return list.filter(v =>
      v.immatriculation.toLowerCase().includes(q) ||
      (v.numeroSerie ?? '').toLowerCase().includes(q) ||
      v.numeroInterne.toLowerCase().includes(q) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  selectionnerVehicule(v: Vehicule) {
    this.vehiculeSelectionne.set(v);
    this.form.get('vehiculeId')!.setValue(String(v.id));
    this.rechercheVehicule.set('');
    this.showVehiculeResults.set(false);
  }

  ouvrirModal() {
    this.showModal.set(true);
    this.form.reset({ priorite: 'NORMALE' });
    this.erreurModal.set('');
    this.etape.set(1);
    this.rechercheVehicule.set('');
    this.vehiculeSelectionne.set(null);
    this.showVehiculeResults.set(false);
  }
  fermerModal() { this.showModal.set(false); }
  suivant() {
    const ctrl1 = this.form.get('vehiculeId');
    if (ctrl1?.invalid) { ctrl1.markAsTouched(); return; }
    this.etape.set(2);
  }
  precedent() { this.etape.set(1); }

  soumettre() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.modalLoading.set(true);
    this.erreurModal.set('');
    const val = this.form.value as any;
    this.svc.create({ ...val, vehiculeId: Number(val.vehiculeId) }).subscribe({
      next: () => { this.fermerModal(); this.charger(); },
      error: err => { this.erreurModal.set(err?.error?.message ?? 'Erreur'); this.modalLoading.set(false); },
    });
  }

  changerStatut(di: DemandeIntervention, statut: string) {
    this.svc.updateStatut(di.id, statut).subscribe({ next: () => this.charger() });
  }

  prioriteClass(p: string): string {
    const m: Record<string, string> = {
      FAIBLE: 'bg-gray-100 text-gray-600',
      NORMALE: 'bg-blue-100 text-blue-700',
      URGENTE: 'bg-orange-100 text-orange-700',
      CRITIQUE: 'bg-red-100 text-red-700',
    };
    return m[p] ?? 'bg-gray-100 text-gray-600';
  }

  statutClass(s: string): string {
    const m: Record<string, string> = {
      EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
      PRISE_EN_CHARGE: 'bg-blue-100 text-blue-700',
      TRAITEE: 'bg-green-100 text-green-700',
      REJETEE: 'bg-gray-100 text-gray-500',
    };
    return m[s] ?? 'bg-gray-100 text-gray-600';
  }
}
