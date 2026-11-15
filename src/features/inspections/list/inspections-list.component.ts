import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { InspectionsService } from '../../../core/services/inspections.service';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { Inspection } from '../../../core/models/inspection.model';
import { Vehicule } from '../../../core/models/vehicule.model';
import { ToastService } from '../../../core/services/toast.service';

interface PointTemplate {
  categorie: string;
  libelle: string;
}

import { AuthService } from '../../../core/services/auth.service';
import { Action } from '../../../core/auth/permissions';
@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [CommonModule, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './inspections-list.component.html',
})
export class InspectionsListComponent implements OnInit {
  private readonly authPermissions = inject(AuthService);
  /** Bouton visible seulement si l'API autorise l'action pour ce rôle */
  peut(action: Action): boolean {
    return this.authPermissions.peut(action);
  }

  private svc = inject(InspectionsService);
  private vehiculesSvc = inject(VehiculesService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  inspections = signal<Inspection[]>([]);
  recherche = signal('');
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  readonly limit = 15;
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  filtreStatut = signal('');
  filtreType = signal('');

  inspectionsFiltrees = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    const statut = this.filtreStatut();
    const type = this.filtreType();
    return this.inspections().filter(
      (i) =>
        (!statut || i.statut === statut) &&
        (!type || i.typeInspection === type) &&
        (!q ||
        `${i.vehicule?.marque ?? ''} ${i.vehicule?.modele ?? ''}`.toLowerCase().includes(q) ||
        (i.vehicule?.numeroInterne ?? '').toLowerCase().includes(q) ||
        (i.vehicule?.numeroSerie ?? '').toLowerCase().includes(q) ||
        (i.inspecteur?.prenom ?? '').toLowerCase().includes(q) ||
        (i.inspecteur?.nom ?? '').toLowerCase().includes(q)),
    );
  });

  // ── Synthèse (toutes les inspections) ────────────────────────────────────
  readonly toutes = signal<Inspection[]>([]);
  readonly synthese = computed(() => {
    const t = this.toutes();
    const conformes = t.filter((i) => i.statut === 'CONFORME').length;
    const notes = t.map((i) => i.noteGlobale).filter((n): n is number => n != null);
    return {
      total: t.length,
      conformes,
      tauxConformite: t.length ? Math.round((conformes / t.length) * 100) : 0,
      nonConformes: t.filter((i) => i.statut === 'NON_CONFORME').length,
      noteMoyenne: notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null,
    };
  });
  readonly comptesStatut = computed(() => {
    const c: Record<string, number> = {};
    for (const i of this.toutes()) c[i.statut] = (c[i.statut] ?? 0) + 1;
    return c;
  });
  readonly statutsListe = ['CONFORME', 'PARTIEL', 'NON_CONFORME'];
  readonly typesListe = ['PRE_DEPART', 'PERIODIQUE', 'RETOUR_MISSION', 'TECHNIQUE'];
  readonly filtresActifs = computed(() => !!this.recherche() || !!this.filtreStatut() || !!this.filtreType());

  reinitialiserFiltres() {
    this.recherche.set('');
    this.filtreStatut.set('');
    this.filtreType.set('');
  }

  statutPoint(s: string): string {
    return ({ CONFORME: 'bg-green-500', NON_CONFORME: 'bg-red-500', PARTIEL: 'bg-amber-500' } as Record<string, string>)[s] ?? 'bg-gray-400';
  }

  // Modal détail
  inspectionDetail = signal<any>(null);
  showDetail = signal(false);
  detailLoading = signal(false);

  // Modal édition
  inspectionAEditer = signal<any>(null);
  showEdit = signal(false);
  editLoading = signal(false);
  editErreur = signal('');

  editForm = this.fb.group({
    notes: [''],
    statut: ['CONFORME'],
  });

  ouvrirEdit(insp: any) {
    this.inspectionAEditer.set(insp);
    this.editErreur.set('');
    this.editForm.patchValue({ notes: insp.notes ?? '', statut: insp.statut });
    this.showEdit.set(true);
  }
  fermerEdit() {
    this.showEdit.set(false);
    this.inspectionAEditer.set(null);
  }

  sauvegarderEdit() {
    const insp = this.inspectionAEditer();
    if (!insp) return;
    this.editLoading.set(true);
    this.editErreur.set('');
    const val = this.editForm.value as any;
    this.svc.update(insp.id, { notes: val.notes, statut: val.statut }).subscribe({
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

  // Wizard
  showModal = signal(false);
  modalLoading = signal(false);
  erreurModal = signal('');
  etape = signal(1);
  vehicules = signal<Vehicule[]>([]);
  vehiculeSelectionne = signal<Vehicule | null>(null);
  rechercheVehicule = signal('');
  showVehiculeResults = signal(false);

  vehiculesFiltres = computed(() => {
    const q = this.rechercheVehicule().toLowerCase().trim();
    if (!q) return this.vehicules().slice(0, 8);
    return this.vehicules()
      .filter(
        (v) =>
          (v.numeroSerie ?? '').toLowerCase().includes(q) ||
          (v.immatriculation ?? '').toLowerCase().includes(q) ||
          (v.numeroInterne ?? '').toLowerCase().includes(q) ||
          `${v.marque} ${v.modele}`.toLowerCase().includes(q),
      )
      .slice(0, 10);
  });

  // Mini-formulaire ajout point
  showAddForm = signal(false);
  newLibelle = signal('');
  newCategorie = signal('');

  categoriesExistantes = computed(() => {
    const seen = new Set<string>();
    this.itemsArray.controls.forEach((c) => {
      const cat = c.get('categorie')!.value;
      if (cat) seen.add(cat);
    });
    return Array.from(seen);
  });

  groupesItems = computed(() => {
    const groups: { categorie: string; indices: number[] }[] = [];
    this.itemsArray.controls.forEach((ctrl, i) => {
      const cat = ctrl.get('categorie')!.value || '—';
      const existing = groups.find((g) => g.categorie === cat);
      if (existing) existing.indices.push(i);
      else groups.push({ categorie: cat, indices: [i] });
    });
    return groups;
  });

  prochainNumeroCategorie = computed(() => {
    const cats = this.categoriesExistantes();
    let max = 0;
    cats.forEach((c) => {
      const m = c.match(/^(\d+)\./);
      if (m) max = Math.max(max, parseInt(m[1]));
    });
    return max + 1;
  });

  estEnginHeure = computed(() => {
    const v = this.vehiculeSelectionne();
    return v?.typeVehicule === 'EQUIPEMENT_SPECIAL' || v?.typeVehicule === 'ENGIN_TP';
  });

  selectionnerVehicule(v: Vehicule) {
    this.form.get('vehiculeId')!.setValue(String(v.id));
    this.rechercheVehicule.set(`${v.marque} ${v.modele} · ${v.numeroInterne}`);
    this.showVehiculeResults.set(false);
  }

  types = [
    { value: 'PRE_DEPART', label: 'Pré-départ' },
    { value: 'PERIODIQUE', label: 'Périodique' },
    { value: 'RETOUR_MISSION', label: 'Retour mission' },
    { value: 'TECHNIQUE', label: 'Technique' },
  ];

  form = this.fb.group({
    vehiculeId: ['', Validators.required],
    typeInspection: ['PRE_DEPART', Validators.required],
    dateInspection: [new Date().toISOString().slice(0, 16), Validators.required],
    kilometrageReleve: [null as number | null],
    heuresMoteurReleve: [null as number | null],
    noteGlobale: [null as number | null],
    notes: [''],
    items: this.fb.array([]),
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  ngOnInit() {
    this.charger();
    this.vehiculesSvc.getAll({ limit: 200 }).subscribe({ next: (r) => this.vehicules.set(r.data) });
    this.form.get('vehiculeId')!.valueChanges.subscribe((id) => this.onVehiculeChange(id));
  }

  charger() {
    this.loading.set(true);
    this.svc.getAll({ page: 1, limit: 500 }).subscribe({ next: (r) => this.toutes.set(r.data) });
    this.svc.getAll({ page: this.page(), limit: this.limit }).subscribe({
      next: (r) => {
        this.inspections.set(r.data);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(p: number) {
    this.page.set(p);
    this.charger();
  }

  ouvrirModal() {
    while (this.itemsArray.length) this.itemsArray.removeAt(0);
    this.form.reset({
      vehiculeId: '',
      typeInspection: 'PRE_DEPART',
      dateInspection: new Date().toISOString().slice(0, 16),
      kilometrageReleve: null,
      heuresMoteurReleve: null,
      noteGlobale: null,
      notes: '',
    });
    this.vehiculeSelectionne.set(null);
    this.rechercheVehicule.set('');
    this.showVehiculeResults.set(false);
    this.erreurModal.set('');
    this.etape.set(1);
    this.showModal.set(true);
  }

  fermerModal() {
    this.showModal.set(false);
  }

  ouvrirDetail(id: number) {
    this.showDetail.set(true);
    this.detailLoading.set(true);
    this.inspectionDetail.set(null);
    this.svc.getOne(id).subscribe({
      next: (d) => {
        this.inspectionDetail.set(d);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }
  fermerDetail() {
    this.showDetail.set(false);
    this.inspectionDetail.set(null);
  }

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

  supprimerInspection(id: number) {
    this.demanderConfirmation('Supprimer cette inspection ? Cette action est irréversible.', () =>
      this.svc.delete(id).subscribe({ next: () => this.charger() }),
    );
  }

  onVehiculeChange(id: string | null) {
    if (!id) {
      this.vehiculeSelectionne.set(null);
      while (this.itemsArray.length) this.itemsArray.removeAt(0);
      return;
    }
    const v = this.vehicules().find((x) => x.id === Number(id)) ?? null;
    this.vehiculeSelectionne.set(v);
    while (this.itemsArray.length) this.itemsArray.removeAt(0);
    if (v) this.pointsParVehicule(v).forEach((p) => this.itemsArray.push(this.creerItem(p)));
  }

  suivant() {
    if (this.etape() === 1) {
      const ctrls = ['vehiculeId', 'typeInspection', 'dateInspection'];
      const invalid = ctrls.some((c) => {
        const ctrl = this.form.get(c);
        ctrl?.markAsTouched();
        return ctrl?.invalid;
      });
      if (!invalid) this.etape.set(2);
    } else if (this.etape() === 2) {
      this.etape.set(3);
    }
  }
  precedent() {
    this.etape.update((e) => e - 1);
  }

  setResultat(i: number, val: string) {
    this.itemsArray.at(i).get('resultat')!.setValue(val);
  }

  ouvrirFormAjout() {
    this.newLibelle.set('');
    this.newCategorie.set('');
    this.showAddForm.set(true);
  }

  confirmerAjout() {
    const lib = this.newLibelle().trim();
    const cat = this.newCategorie().trim();
    if (!lib || !cat) return;
    this.itemsArray.push(this.creerItem({ categorie: cat, libelle: lib }));
    this.showAddForm.set(false);
  }

  supprimerItem(i: number) {
    this.itemsArray.removeAt(i);
  }

  soumettre() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalLoading.set(true);
    this.erreurModal.set('');
    const val = this.form.value as any;
    const payload: any = { ...val, vehiculeId: Number(val.vehiculeId) };
    if (!payload.kilometrageReleve) delete payload.kilometrageReleve;
    if (!payload.heuresMoteurReleve) delete payload.heuresMoteurReleve;
    if (payload.noteGlobale === null || payload.noteGlobale === '') delete payload.noteGlobale;
    this.svc.create(payload).subscribe({
      next: () => {
        this.fermerModal();
        this.charger();
        this.modalLoading.set(false);
        this.toast.success('Inspection enregistrée avec succès');
      },
      error: (err) => {
        this.modalLoading.set(false);
        this.toast.error(err?.error?.message ?? "Erreur lors de l'enregistrement");
      },
    });
  }

  hasKoItems() {
    return this.itemsArray.controls.some((c) => c.get('resultat')!.value === 'KO');
  }

  resultatClass(r: string) {
    return r === 'OK'
      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
      : r === 'KO'
        ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
        : r === 'NA'
          ? 'bg-gray-100 text-gray-500 ring-2 ring-gray-300'
          : '';
  }

  typeLabel(t: string): string {
    const m: Record<string, string> = {
      PRE_DEPART: 'Pré-départ',
      PERIODIQUE: 'Périodique',
      RETOUR_MISSION: 'Retour mission',
      TECHNIQUE: 'Technique',
    };
    return m[t] ?? t;
  }

  statutLabel(s: string): string {
    const m: Record<string, string> = {
      CONFORME: 'Conforme',
      NON_CONFORME: 'Non conforme',
      PARTIEL: 'Partiel',
    };
    return m[s] ?? s;
  }

  statutClass(s: string): string {
    const m: Record<string, string> = {
      CONFORME: 'bg-green-50 text-green-700 ring-green-600/20',
      NON_CONFORME: 'bg-red-50 text-red-700 ring-red-600/20',
      PARTIEL: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    };
    return m[s] ?? 'bg-gray-100 text-gray-600 ring-gray-500/20';
  }

  private creerItem(vals?: Partial<PointTemplate>) {
    return this.fb.group({
      categorie: [vals?.categorie ?? '', Validators.required],
      libelle: [vals?.libelle ?? '', Validators.required],
      resultat: ['OK', Validators.required],
      observation: [''],
    });
  }

  private pointsParVehicule(v: Vehicule): PointTemplate[] {
    const modele = (v.modele ?? '').toLowerCase();
    if (modele.includes('se220') || modele.includes('pelle'))
      return [
        { categorie: '1. GRAISSAGES', libelle: "Graissage couronne et pignon d'orientation" },
        {
          categorie: '1. GRAISSAGES',
          libelle: 'Graissage axes pied de flèche, flèche et balancier',
        },
        { categorie: '1. GRAISSAGES', libelle: "Graissage axes d'articulation du godet" },
        { categorie: '1. GRAISSAGES', libelle: 'État des graisseurs (propres, non bouchés)' },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'Galets supérieurs et inférieurs' },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'Roue folle & Ressort tendeur' },
        {
          categorie: '3. CONFORMITÉ',
          libelle: 'Consommables conformes (huiles, filtres, graisse)',
        },
        { categorie: '3. CONFORMITÉ', libelle: 'Intervalles de maintenance respectés' },
      ];
    if (modele.includes('sg19') || modele.includes('niveleuse'))
      return [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage articulations de direction' },
        { categorie: '1. GRAISSAGES', libelle: 'Graissage cardans et articulations' },
        { categorie: '2. ROULEMENT', libelle: 'Pneumatiques (pression, usure)' },
        { categorie: '2. ROULEMENT', libelle: 'Système de direction' },
        { categorie: '3. CONFORMITÉ', libelle: 'Consommables conformes' },
        { categorie: '3. CONFORMITÉ', libelle: 'Intervalles respectés' },
      ];
    if (modele.includes('sd22') || modele.includes('bull') || modele.includes('bulldozer'))
      return [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage général (points de graissage)' },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'Galets supérieurs et inférieurs' },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'Roue folle : alignement et tension' },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'État des chenilles' },
        { categorie: '3. CONFORMITÉ', libelle: 'Consommables conformes' },
        { categorie: '3. CONFORMITÉ', libelle: 'Intervalles respectés' },
      ];
    if (modele.includes('xct') || (modele.includes('grue') && !modele.includes('camion')))
      return [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage câbles de levage' },
        { categorie: '1. GRAISSAGES', libelle: 'Graissage pivot et articulations' },
        { categorie: '2. HYDRAULIQUE', libelle: 'Absence de fuites sur flexibles et vérins' },
        { categorie: '2. HYDRAULIQUE', libelle: 'Pression hydraulique conforme' },
        { categorie: '3. LEVAGE', libelle: 'État des câbles (usure, déformation)' },
        { categorie: '3. LEVAGE', libelle: 'Cales de sécurité présentes' },
        { categorie: '3. LEVAGE', libelle: 'Stabilisateurs fonctionnels' },
        { categorie: '4. CONFORMITÉ', libelle: 'Consommables et intervalles conformes' },
      ];
    if (modele.includes('sr14') || modele.includes('rouleau lisse'))
      return [
        {
          categorie: '1. NIVEAUX',
          libelle: 'Huile moteur, refroidissement, hydraulique, carburant',
        },
        { categorie: '2. GRAISSAGES', libelle: 'Articulations cadre, paliers rouleau, direction' },
        {
          categorie: '3. VIBRATION',
          libelle: 'Fonctionnement vibration (haute et basse fréquence)',
        },
        { categorie: '4. BANDAGE', libelle: 'Absence de fissures/déformations sur le bandage' },
        { categorie: '4. BANDAGE', libelle: "Système d'arrosage fonctionnel" },
        { categorie: '5. SÉCURITÉ', libelle: 'Klaxon, éclairage, gyrophare, signaux recul' },
        { categorie: '6. CONFORMITÉ', libelle: 'Consommables et intervalles conformes' },
      ];
    if (v.typeVehicule === 'CAMION') {
      const pts: PointTemplate[] = [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage arbres de transmission et cardans' },
        { categorie: '2. ROULEMENT', libelle: 'État, usure et pression des pneumatiques' },
        { categorie: '2. ROULEMENT', libelle: 'Lames de suspension et amortisseurs' },
        { categorie: '2. ROULEMENT', libelle: "Freinage pneumatique (fuites d'air, garnitures)" },
      ];
      if (modele.includes('citern') || modele.includes('eau'))
        pts.push(
          { categorie: '3. CITERNE', libelle: 'Étanchéité citerne (fuites, soudures)' },
          { categorie: '3. CITERNE', libelle: 'Vannes, robinets, raccords' },
          { categorie: '3. CITERNE', libelle: 'Pompe à eau, buses et rampes' },
        );
      if (modele.includes('grue') || modele.includes('levage'))
        pts.push(
          { categorie: '3. GRUE', libelle: 'Graissage pivot et articulations' },
          { categorie: '3. GRUE', libelle: 'Stabilisateurs et cales de sécurité' },
          { categorie: '3. GRUE', libelle: 'Pression hydraulique, fuites' },
        );
      pts.push({ categorie: '4. CONFORMITÉ', libelle: 'Consommables et intervalles conformes' });
      return pts;
    }
    if (v.typeVehicule === 'VOITURE')
      return [
        { categorie: '1. NIVEAUX', libelle: 'Huile moteur, refroidissement, boîte de vitesses' },
        { categorie: '1. NIVEAUX', libelle: 'Carnet de bord à jour' },
        { categorie: '2. GRAISSAGES', libelle: 'Rotules de direction et cardans' },
        { categorie: '3. GÉNÉRAL', libelle: 'Usure bande de roulement (min 1.6 mm)' },
        { categorie: '3. GÉNÉRAL', libelle: "Aucun voyant d'alerte allumé" },
      ];
    return [
      { categorie: '1. NIVEAUX', libelle: 'Huile moteur, refroidissement, hydraulique' },
      { categorie: '2. GRAISSAGES', libelle: 'Points de graissage définis fabricant' },
      { categorie: '3. MOTEUR', libelle: 'État général (fuites, bruit, fumée)' },
      { categorie: '3. MOTEUR', libelle: 'Filtre à air' },
      { categorie: '4. CONFORMITÉ', libelle: 'Consommables et intervalles conformes' },
    ];
  }
}
