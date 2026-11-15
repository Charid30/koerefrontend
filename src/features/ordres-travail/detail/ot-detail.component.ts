import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OtService } from '../../../core/services/ot.service';
import { OrdreTravail, OtMecanicien } from '../../../core/models/ot.model';
import {
  OT_STATUT_LABELS,
  OT_STATUT_CLASSES,
  OT_STATUT_POINTS,
  OT_TRANSITIONS,
  OT_ETAPES,
  indexEtape,
} from '../ot.constants';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  UploadService,
  TypePhotoOT,
  urlFichier,
  estPdf,
  verifierFichier,
  TYPES_ACCEPTES,
} from '../../../core/services/upload.service';
import { Action } from '../../../core/auth/permissions';

interface Personne { id: number; nom: string; prenom: string }

@Component({
  selector: 'app-ot-detail',
  standalone: true,
  imports: [NgClass, RouterLink, DatePipe, DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ot-detail.component.html',
})
export class OtDetailComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private svc = inject(OtService);
  private upload = inject(UploadService);
  private toast = inject(ToastService);

  readonly etapes = OT_ETAPES;
  readonly typesAcceptes = TYPES_ACCEPTES;
  readonly urlFichier = urlFichier;
  readonly estPdf = estPdf;

  ot = signal<OrdreTravail | null>(null);
  loading = signal(true);
  actionLoading = signal(false);

  // ── Changement de statut (avec note pour le contrôle et la clôture) ─────
  statutDemande = signal<string | null>(null);
  noteStatut = '';

  // ── Mécaniciens ─────────────────────────────────────────────────────────
  mecaniciensDispo = signal<Personne[]>([]);
  mecanicienChoisi: number | null = null;
  travauxOuvert = signal<number | null>(null);
  travaux = { tempsPasse: null as number | null, diagnostic: '', travauxEffectues: '' };

  // ── Coûts ───────────────────────────────────────────────────────────────
  coutsOuvert = signal(false);
  couts = { coutPiecesTotal: 0, coutPrestataire: 0, heuresInternesTotal: 0, prestatireExterne: '' };

  // ── Photos ──────────────────────────────────────────────────────────────
  typePhoto: TypePhotoOT = 'AVANT';
  envoiPhoto = signal(false);
  apercu = signal<string | null>(null);

  readonly monId = computed(() => this.auth.user()?.id ?? null);

  readonly transitionsDisponibles = computed(() => {
    const statut = this.ot()?.statut;
    return statut ? (OT_TRANSITIONS[statut] ?? []) : [];
  });

  readonly etapeActuelle = computed(() => indexEtape(this.ot()?.statut ?? ''));
  readonly annule = computed(() => this.ot()?.statut === 'ANNULE');
  readonly enAttente = computed(() => {
    const s = this.ot()?.statut;
    return s === 'EN_ATTENTE_PIECES' || s === 'EN_ATTENTE_PRESTATAIRE' ? this.statutLabel(s) : null;
  });

  readonly coutTotal = computed(() => {
    const o = this.ot();
    return o ? Number(o.coutPiecesTotal ?? 0) + Number(o.coutPrestataire ?? 0) : 0;
  });

  readonly mecaniciensNonAffectes = computed(() => {
    const affectes = new Set((this.ot()?.mecaniciens ?? []).map((m) => m.mecanicienId));
    return this.mecaniciensDispo().filter((m) => !affectes.has(m.id));
  });

  readonly photosParType = computed(() => {
    const photos = this.ot()?.photos ?? [];
    return (['AVANT', 'APRES', 'PIECE'] as TypePhotoOT[])
      .map((type) => ({ type, label: this.libellePhoto(type), photos: photos.filter((p) => p.type === type) }))
      .filter((g) => g.photos.length > 0);
  });

  /** Un OT clôturé ou annulé n'est plus modifiable */
  readonly fige = computed(() => ['CLOTURE', 'ANNULE'].includes(this.ot()?.statut ?? ''));

  peut(action: Action): boolean {
    return this.auth.peut(action);
  }

  ngOnInit() {
    this.charger();
    if (this.peut('ot.affecter')) {
      this.svc.mecaniciens().subscribe({ next: (l) => this.mecaniciensDispo.set(l) });
    }
  }

  private get id() {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  charger() {
    this.svc.getOne(this.id).subscribe({
      next: (ot) => {
        this.ot.set(ot);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private erreur(err: any, defaut: string) {
    this.toast.error(err?.error?.message ?? defaut);
  }

  // ── Statut ──────────────────────────────────────────────────────────────
  /** Le passage en contrôle ou en clôture demande une note (facultative) */
  demanderStatut(statut: string) {
    if (statut === 'CONTROLE' || statut === 'CLOTURE' || statut === 'ANNULE') {
      this.noteStatut = statut === 'ANNULE' ? '' : (this.ot()?.notesControle ?? '');
      this.statutDemande.set(statut);
    } else {
      this.changerStatut(statut);
    }
  }

  changerStatut(statut: string, note?: string) {
    const ot = this.ot();
    if (!ot) return;
    this.actionLoading.set(true);
    this.svc.updateStatut(ot.id, statut, note?.trim() || undefined).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.statutDemande.set(null);
        this.toast.success(`OT passé à « ${this.statutLabel(statut)} »`);
        this.charger();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.erreur(err, 'Impossible de changer le statut.');
      },
    });
  }

  // ── Mécaniciens ─────────────────────────────────────────────────────────
  affecter() {
    const ot = this.ot();
    if (!ot || !this.mecanicienChoisi) return;
    this.svc.affecterMecanicien(ot.id, Number(this.mecanicienChoisi)).subscribe({
      next: () => {
        this.mecanicienChoisi = null;
        this.toast.success('Mécanicien affecté');
        this.charger();
      },
      error: (err) => this.erreur(err, 'Affectation impossible.'),
    });
  }

  retirer(m: OtMecanicien) {
    const ot = this.ot();
    if (!ot) return;
    const nom = m.mecanicien ? `${m.mecanicien.prenom} ${m.mecanicien.nom}` : 'ce mécanicien';
    if (!confirm(`Retirer ${nom} de cet OT ?`)) return;
    this.svc.retirerMecanicien(ot.id, m.mecanicienId).subscribe({
      next: () => {
        this.toast.success('Mécanicien retiré');
        this.charger();
      },
      error: (err) => this.erreur(err, 'Impossible de retirer ce mécanicien.'),
    });
  }

  /** L'encadrement saisit pour tous ; un mécanicien seulement pour lui-même */
  peutSaisirTravaux(m: OtMecanicien): boolean {
    if (this.fige() || !this.peut('ot.travaux')) return false;
    return this.auth.role() !== 'MECANICIEN' || m.mecanicienId === this.monId();
  }

  ouvrirTravaux(m: OtMecanicien) {
    this.travaux = {
      tempsPasse: m.tempsPasse != null ? Number(m.tempsPasse) : null,
      diagnostic: m.diagnostic ?? '',
      travauxEffectues: m.travauxEffectues ?? '',
    };
    this.travauxOuvert.set(m.mecanicienId);
  }

  enregistrerTravaux(m: OtMecanicien) {
    const ot = this.ot();
    if (!ot) return;
    const t = this.travaux;
    this.svc
      .updateTravaux(ot.id, m.mecanicienId, {
        ...(t.tempsPasse != null && `${t.tempsPasse}` !== '' ? { tempsPasse: Number(t.tempsPasse) } : {}),
        diagnostic: t.diagnostic,
        travauxEffectues: t.travauxEffectues,
      })
      .subscribe({
        next: () => {
          this.travauxOuvert.set(null);
          this.toast.success('Compte rendu enregistré');
          this.charger();
        },
        error: (err) => this.erreur(err, 'Enregistrement impossible.'),
      });
  }

  // ── Coûts ───────────────────────────────────────────────────────────────
  ouvrirCouts() {
    const o = this.ot();
    if (!o) return;
    this.couts = {
      coutPiecesTotal: Number(o.coutPiecesTotal ?? 0),
      coutPrestataire: Number(o.coutPrestataire ?? 0),
      heuresInternesTotal: Number(o.heuresInternesTotal ?? 0),
      prestatireExterne: o.prestatireExterne ?? '',
    };
    this.coutsOuvert.set(true);
  }

  enregistrerCouts() {
    const o = this.ot();
    if (!o) return;
    const c = this.couts;
    const valeurs = [c.coutPiecesTotal, c.coutPrestataire, c.heuresInternesTotal].map((v) => Number(v || 0));
    if (valeurs.some((v) => Number.isNaN(v) || v < 0)) {
      this.toast.error('Les montants doivent être des nombres positifs.');
      return;
    }
    this.svc
      .updateCouts(o.id, {
        coutPiecesTotal: valeurs[0],
        coutPrestataire: valeurs[1],
        heuresInternesTotal: valeurs[2],
        prestatireExterne: c.prestatireExterne.trim(),
      })
      .subscribe({
        next: () => {
          this.coutsOuvert.set(false);
          this.toast.success('Coûts enregistrés');
          this.charger();
        },
        error: (err) => this.erreur(err, 'Enregistrement impossible.'),
      });
  }

  // ── Photos ──────────────────────────────────────────────────────────────
  envoyerPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const fichiers = Array.from(input.files ?? []);
    input.value = '';
    const ot = this.ot();
    if (!ot || fichiers.length === 0) return;
    for (const f of fichiers) {
      const probleme = verifierFichier(f);
      if (probleme) {
        this.toast.error(`${f.name} : ${probleme}`);
        return;
      }
    }
    this.envoiPhoto.set(true);
    let restants = fichiers.length;
    const fin = () => {
      if (--restants === 0) {
        this.envoiPhoto.set(false);
        this.charger();
      }
    };
    for (const f of fichiers) {
      this.upload.photoOt(ot.id, f, this.typePhoto).subscribe({
        next: fin,
        error: (err) => {
          this.erreur(err, `Envoi de ${f.name} impossible.`);
          fin();
        },
      });
    }
  }

  supprimerPhoto(photoId: number) {
    if (!confirm('Supprimer cette photo ?')) return;
    this.upload.supprimerPhotoOt(photoId).subscribe({
      next: () => {
        this.toast.success('Photo supprimée');
        this.charger();
      },
      error: (err) => this.erreur(err, 'Suppression impossible.'),
    });
  }

  libellePhoto(t: string) {
    return t === 'AVANT' ? 'Avant intervention' : t === 'APRES' ? 'Après intervention' : 'Pièces';
  }

  // ── Libellés ────────────────────────────────────────────────────────────
  transitionClass(statut: string): string {
    if (statut === 'ANNULE') return 'btn-secondaire text-red-700 hover:bg-red-50';
    if (statut === 'CLOTURE' || statut === 'TERMINE') return 'btn-primaire';
    return 'btn-secondaire';
  }

  statutLabel(s: string) {
    return OT_STATUT_LABELS[s] ?? s;
  }
  statutClass(s: string) {
    return OT_STATUT_CLASSES[s] ?? 'bg-gray-100 text-gray-600 ring-gray-500/20';
  }
  statutPoint(s: string) {
    return OT_STATUT_POINTS[s] ?? 'bg-gray-400';
  }
  initiales(p?: { nom: string; prenom: string }) {
    return p ? `${p.prenom?.[0] ?? ''}${p.nom?.[0] ?? ''}`.toUpperCase() : '?';
  }
}
