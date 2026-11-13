import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgClass, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { StocksService } from '../../../core/services/stocks.service';
import { PieceStock, MouvementStock } from '../../../core/models/stock.model';
import { ToastService } from '../../../core/services/toast.service';
import { AlerteFlottanteComponent } from '../../../shared/alerte-flottante/alerte-flottante.component';

@Component({
  selector: 'app-stocks-list',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    DecimalPipe,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    AlerteFlottanteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './stocks-list.component.html',
})
export class StocksListComponent implements OnInit {
  private svc = inject(StocksService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  pieces = signal<PieceStock[]>([]);
  alertes = signal<PieceStock[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  readonly limit = 20;
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  // ── Recherche et filtres (sur la page chargée) ────────────────────────────
  recherche = signal('');
  filtreCategorie = signal<string | null>(null);
  seulementAlertes = signal(false);

  readonly categories = computed(() =>
    [...new Set(this.pieces().map((p) => p.categorie).filter((c): c is string => !!c))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    ),
  );

  readonly piecesFiltrees = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    const cat = this.filtreCategorie();
    return this.pieces()
      .filter((p) => !cat || p.categorie === cat)
      .filter((p) => !this.seulementAlertes() || p.quantiteDisponible <= p.quantiteMinimum)
      .filter(
        (p) =>
          !q ||
          p.designation.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          (p.marque ?? '').toLowerCase().includes(q) ||
          (p.emplacement ?? '').toLowerCase().includes(q),
      );
  });

  readonly filtresActifs = computed(
    () => !!this.recherche() || !!this.filtreCategorie() || this.seulementAlertes(),
  );

  reinitialiserFiltres() {
    this.recherche.set('');
    this.filtreCategorie.set(null);
    this.seulementAlertes.set(false);
  }

  /** Indicateurs. La valeur n'est exacte que si toutes les pièces tiennent sur une page. */
  readonly stats = computed(() => {
    const pieces = this.pieces();
    const complet = this.total() <= pieces.length;
    return {
      references: this.total(),
      valeur: complet ? pieces.reduce((s, p) => s + p.quantiteDisponible * (p.prixUnitaire ?? 0), 0) : null,
      sousSeuil: this.alertes().filter((p) => p.quantiteDisponible > 0).length,
      ruptures: this.alertes().filter((p) => p.quantiteDisponible <= 0).length,
    };
  });

  readonly alerteCritique = computed(() => this.alertes().some((p) => p.quantiteDisponible <= 0));

  /** État d'une pièce : toujours affiché avec une icône et un libellé. */
  etat(p: PieceStock): { niveau: 'ok' | 'attention' | 'critique'; texte: string } {
    if (p.quantiteDisponible <= 0) return { niveau: 'critique', texte: 'Rupture' };
    if (p.quantiteDisponible <= p.quantiteMinimum) return { niveau: 'attention', texte: 'Sous le seuil' };
    return { niveau: 'ok', texte: 'En stock' };
  }

  /** Remplissage de la jauge : le seuil est placé au milieu de la barre. */
  jauge(p: PieceStock): number {
    const ref = Math.max(1, p.quantiteMinimum * 2);
    return Math.min(100, (p.quantiteDisponible / ref) * 100);
  }

  fcfa(montant: number): string {
    return `${new Intl.NumberFormat('fr-FR', {
      notation: montant >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(montant)} FCFA`;
  }

  /** Depuis l'alerte flottante : ouvre directement une entrée de stock. */
  reapprovisionner(p: PieceStock) {
    this.ouvrirMouvement(p);
    this.mouvType = 'ENTREE';
    this.mouvQuantite = Math.max(1, p.quantiteMinimum * 2 - p.quantiteDisponible);
  }

  // Modal édition (wizard 2 étapes)
  pieceAEditer = signal<PieceStock | null>(null);
  showEditModal = signal(false);
  editLoading = signal(false);
  editErreur = signal('');
  editEtape = signal(1);
  readonly editNbEtapes = 2;

  readonly editEtapes = [
    { num: 1, titre: 'Identification' },
    { num: 2, titre: 'Stock & Prix' },
  ];

  editForm = this.fb.group({
    designation: ['', Validators.required],
    reference: ['', Validators.required],
    marque: [''],
    categorie: [''],
    quantiteMinimum: [0],
    unite: ['unité'],
    prixUnitaire: [null as number | null],
    emplacement: [''],
  });

  suivantEdit() {
    const ctrls = ['designation', 'reference'];
    const invalid = ctrls.some((c) => {
      const ctrl = this.editForm.get(c);
      ctrl?.markAsTouched();
      return ctrl?.invalid;
    });
    if (!invalid) this.editEtape.set(2);
  }
  precedentEdit() {
    this.editEtape.set(1);
  }

  // Modal historique mouvements
  pieceHistorique = signal<PieceStock | null>(null);
  historique = signal<MouvementStock[]>([]);
  showHistorique = signal(false);
  historiqueLoading = signal(false);

  // Modal mouvement
  pieceMouvement = signal<PieceStock | null>(null);
  mouvType = 'ENTREE';
  mouvQuantite = 1;
  mouvMotif = '';
  mouvLoading = signal(false);
  mouvErreur = signal('');

  // Modal création
  showModal = signal(false);
  modalLoading = signal(false);
  erreurModal = signal('');
  etape = signal(1);

  form = this.fb.group({
    reference: ['', Validators.required],
    designation: ['', Validators.required],
    marque: [''],
    categorie: [''],
    quantiteDisponible: [0],
    quantiteMinimum: [0],
    unite: ['unité'],
    prixUnitaire: [null as number | null],
    emplacement: [''],
  });

  ngOnInit() {
    this.charger();
    this.svc.getPiecesEnAlerte().subscribe({ next: (a) => this.alertes.set(a) });
  }

  charger() {
    this.loading.set(true);
    this.svc.getPieces(this.page(), this.limit).subscribe({
      next: (r) => {
        this.pieces.set(r.data);
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
    this.form.reset({ quantiteDisponible: 0, quantiteMinimum: 0, unite: 'unité' });
    this.erreurModal.set('');
    this.etape.set(1);
    this.showModal.set(true);
  }
  fermerModal() {
    this.showModal.set(false);
  }

  suivant() {
    const ctrls = ['reference', 'designation'];
    const invalid = ctrls.some((c) => {
      const ctrl = this.form.get(c);
      ctrl?.markAsTouched();
      return ctrl?.invalid;
    });
    if (!invalid) this.etape.set(2);
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
    this.svc.createPiece(this.form.value as any).subscribe({
      next: () => {
        this.fermerModal();
        this.charger();
        this.modalLoading.set(false);
        this.toast.success('Pièce créée avec succès');
      },
      error: (err) => {
        this.modalLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la création');
      },
    });
  }

  stockClass(p: PieceStock): string {
    if (p.quantiteDisponible <= 0) return 'text-red-600';
    if (p.quantiteDisponible <= p.quantiteMinimum) return 'text-orange-500';
    return 'text-green-600';
  }

  ouvrirHistorique(p: PieceStock) {
    this.pieceHistorique.set(p);
    this.showHistorique.set(true);
    this.historiqueLoading.set(true);
    this.svc.getMouvements(p.id).subscribe({
      next: (m) => {
        this.historique.set(m);
        this.historiqueLoading.set(false);
      },
      error: () => this.historiqueLoading.set(false),
    });
  }
  fermerHistorique() {
    this.showHistorique.set(false);
    this.pieceHistorique.set(null);
    this.historique.set([]);
  }

  ouvrirMouvement(p: PieceStock) {
    this.pieceMouvement.set(p);
    this.mouvType = 'ENTREE';
    this.mouvQuantite = 1;
    this.mouvMotif = '';
    this.mouvErreur.set('');
  }
  fermerMouvement() {
    this.pieceMouvement.set(null);
  }

  ouvrirEdit(p: PieceStock) {
    this.editEtape.set(1);
    this.pieceAEditer.set(p);
    this.editForm.patchValue({
      designation: p.designation,
      reference: p.reference,
      marque: p.marque ?? '',
      categorie: p.categorie ?? '',
      quantiteMinimum: p.quantiteMinimum,
      unite: p.unite,
      prixUnitaire: p.prixUnitaire ?? null,
      emplacement: p.emplacement ?? '',
    });
    this.editErreur.set('');
    this.showEditModal.set(true);
  }

  fermerEdit() {
    this.showEditModal.set(false);
    this.pieceAEditer.set(null);
  }

  sauvegarderEdit() {
    const p = this.pieceAEditer();
    if (!p || this.editForm.invalid) return;
    this.editLoading.set(true);
    this.editErreur.set('');
    const val = this.editForm.value as any;
    this.svc.updatePiece(p.id, val).subscribe({
      next: () => {
        this.fermerEdit();
        this.editLoading.set(false);
        this.charger();
        this.toast.success('Pièce mise à jour');
      },
      error: (e) => {
        this.editLoading.set(false);
        this.toast.error(e?.error?.message ?? 'Erreur lors de la modification');
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

  supprimerPiece(p: any) {
    this.demanderConfirmation(
      `Supprimer la pièce "${p.designation}" (${p.reference}) ? Cette action est irréversible.`,
      () =>
        this.svc.deletePiece(p.id).subscribe({
          next: () => {
            this.charger();
            this.toast.success('Pièce supprimée');
          },
          error: (e) => this.toast.error(e?.error?.message ?? 'Erreur lors de la suppression'),
        }),
    );
  }

  enregistrerMouvement() {
    const piece = this.pieceMouvement();
    if (!piece || this.mouvQuantite < 1) return;
    this.mouvLoading.set(true);
    this.svc
      .enregistrerMouvement({
        pieceId: piece.id,
        typeMouvement: this.mouvType,
        quantite: this.mouvQuantite,
        motif: this.mouvMotif || undefined,
      })
      .subscribe({
        next: () => {
          this.fermerMouvement();
          this.mouvLoading.set(false);
          this.charger();
          this.svc.getPiecesEnAlerte().subscribe({ next: (a) => this.alertes.set(a) });
          this.toast.success('Mouvement enregistré');
        },
        error: (err) => {
          this.mouvLoading.set(false);
          this.toast.error(err?.error?.message ?? 'Erreur lors du mouvement');
        },
      });
  }
}
