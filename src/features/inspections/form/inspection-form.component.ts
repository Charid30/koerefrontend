import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InspectionsService } from '../../../core/services/inspections.service';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { Vehicule } from '../../../core/models/vehicule.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService, verifierFichier, TYPES_IMAGES } from '../../../core/services/upload.service';
import { forkJoin, of, catchError } from 'rxjs';

interface PointTemplate {
  categorie: string;
  libelle: string;
}

@Component({
  selector: 'app-inspection-form',
  standalone: true,
  imports: [NgClass, TitleCasePipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './inspection-form.component.html',
})
export class InspectionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private svc = inject(InspectionsService);
  private vehiculesSvc = inject(VehiculesService);
  private auth = inject(AuthService);
  private upload = inject(UploadService);
  private toast = inject(ToastService);

  readonly typesImages = TYPES_IMAGES;
  readonly peutPhoto = this.auth.peut('inspection.photo');

  /** Photos prises pendant l'inspection, rattachées à leur point de contrôle */
  photos = signal(new Map<AbstractControl, { fichier: File; apercu: string }>());

  loading = signal(false);
  erreurServeur = signal('');
  vehicules = signal<Vehicule[]>([]);
  vehiculeSelectionne = signal<Vehicule | null>(null);

  estEnginHeure = computed(() => {
    const v = this.vehiculeSelectionne();
    return v?.typeVehicule === 'EQUIPEMENT_SPECIAL' || v?.typeVehicule === 'ENGIN_TP';
  });

  types = [
    { value: 'PRE_DEPART', label: 'Pré-départ' },
    { value: 'PERIODIQUE', label: 'Périodique' },
    { value: 'RETOUR_MISSION', label: 'Retour de mission' },
    { value: 'TECHNIQUE', label: 'Technique' },
  ];

  form = this.fb.group({
    vehiculeId: ['', Validators.required],
    typeInspection: ['PRE_DEPART', Validators.required],
    dateInspection: [new Date().toISOString().slice(0, 16), Validators.required],
    kilometrageReleve: [null as number | null],
    heuresMoteurReleve: [null as number | null],
    noteGlobale: [null as number | null, [Validators.min(0), Validators.max(20)]],
    notes: [''],
    items: this.fb.array([]),
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  ngOnInit() {
    this.vehiculesSvc.getAll({ limit: 200 }).subscribe({
      next: (r) => this.vehicules.set(r.data),
    });
    this.form.get('vehiculeId')!.valueChanges.subscribe((id) => this.onVehiculeChange(id));
  }

  private onVehiculeChange(id: string | null) {
    if (!id) {
      this.vehiculeSelectionne.set(null);
      return;
    }
    const v = this.vehicules().find((x) => x.id === Number(id)) ?? null;
    this.vehiculeSelectionne.set(v);
    this.chargerPointsTemplate(v);
  }

  private chargerPointsTemplate(v: Vehicule | null) {
    while (this.itemsArray.length) this.itemsArray.removeAt(0);
    if (!v) return;
    this.pointsParVehicule(v).forEach((p) => this.itemsArray.push(this.creerItem(p)));
  }

  private pointsParVehicule(v: Vehicule): PointTemplate[] {
    const modele = (v.modele ?? '').toLowerCase();
    const marque = (v.marque ?? '').toLowerCase();

    // Pelle Hydraulique SE220
    if (modele.includes('se220') || modele.includes('pelle')) {
      return [
        {
          categorie: '1. CONTRÔLE DES GRAISSAGES',
          libelle: "Graissage de la couronne et du pignon d'orientation",
        },
        {
          categorie: '1. CONTRÔLE DES GRAISSAGES',
          libelle: 'Graissage des axes du pied de flèche, de la flèche et du balancier',
        },
        {
          categorie: '1. CONTRÔLE DES GRAISSAGES',
          libelle: "Graissage des axes d'articulation du godet",
        },
        {
          categorie: '1. CONTRÔLE DES GRAISSAGES',
          libelle: 'État général des graisseurs (propres, non bouchés, présents)',
        },
        {
          categorie: '2. TRAIN DE ROULEMENT',
          libelle: 'Contrôle des galets supérieurs et inférieurs',
        },
        {
          categorie: '2. TRAIN DE ROULEMENT',
          libelle: 'Roue folle & Ressort tendeur : alignement et absence de jeu',
        },
        {
          categorie: '3. CONFORMITÉ GÉNÉRALE',
          libelle: 'Conformité des consommables utilisés (huiles, filtres, graisse)',
        },
        { categorie: '3. CONFORMITÉ GÉNÉRALE', libelle: 'Respect des intervalles de maintenances' },
      ];
    }

    // Niveleuse SG19B6
    if (modele.includes('sg19') || modele.includes('niveleuse')) {
      return [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage des articulations de direction' },
        { categorie: '1. GRAISSAGES', libelle: 'Graissage des cardans et articulations' },
        { categorie: '1. GRAISSAGES', libelle: 'État général des graisseurs' },
        {
          categorie: '2. ROULEMENT & DIRECTION',
          libelle: 'Vérification des pneumatiques (pression, usure)',
        },
        { categorie: '2. ROULEMENT & DIRECTION', libelle: 'État du système de direction' },
        {
          categorie: '3. CONFORMITÉ GÉNÉRALE',
          libelle: 'Conformité des consommables (huiles, filtres, graisse)',
        },
        { categorie: '3. CONFORMITÉ GÉNÉRALE', libelle: 'Respect des intervalles de maintenance' },
      ];
    }

    // Bull SD22
    if (modele.includes('sd22') || modele.includes('bull') || modele.includes('bulldozer')) {
      return [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage général (points de graissage)' },
        { categorie: '1. GRAISSAGES', libelle: 'État général des graisseurs' },
        {
          categorie: '2. TRAIN DE ROULEMENT',
          libelle: 'Contrôle des galets (supérieurs et inférieurs)',
        },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'Roue folle : alignement et tension' },
        { categorie: '2. TRAIN DE ROULEMENT', libelle: 'État des chenilles' },
        { categorie: '3. CONFORMITÉ GÉNÉRALE', libelle: 'Conformité des consommables utilisés' },
        {
          categorie: '3. CONFORMITÉ GÉNÉRALE',
          libelle: 'Respect des intervalles (compteur à jour)',
        },
      ];
    }

    // Grue XCT60
    if (
      modele.includes('xct60') ||
      modele.includes('xct') ||
      (modele.includes('grue') && !modele.includes('camion'))
    ) {
      return [
        { categorie: '1. GRAISSAGES', libelle: 'Graissage des câbles de levage' },
        { categorie: '1. GRAISSAGES', libelle: 'Graissage du pivot et articulations de grue' },
        { categorie: '1. GRAISSAGES', libelle: 'État général des graisseurs' },
        {
          categorie: '2. SYSTÈME HYDRAULIQUE',
          libelle: 'Absence de fuites sur flexibles et vérins',
        },
        { categorie: '2. SYSTÈME HYDRAULIQUE', libelle: 'Pression hydraulique conforme' },
        { categorie: '3. LEVAGE & CÂBLES', libelle: 'État des câbles (usure, déformation)' },
        { categorie: '3. LEVAGE & CÂBLES', libelle: 'Cales de sécurité présentes' },
        { categorie: '3. LEVAGE & CÂBLES', libelle: 'Stabilisateurs / béquilles fonctionnels' },
        { categorie: '4. CONFORMITÉ GÉNÉRALE', libelle: 'Conformité des consommables' },
        { categorie: '4. CONFORMITÉ GÉNÉRALE', libelle: 'Respect des intervalles' },
      ];
    }

    // Rouleau Lisse SR14
    if (modele.includes('sr14') || (modele.includes('rouleau') && modele.includes('lisse'))) {
      return [
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile moteur (jauge)' },
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau liquide de refroidissement' },
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile hydraulique (réservoir)' },
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau carburant' },
        {
          categorie: '2. GRAISSAGES & LUBRIFICATION',
          libelle: "Graissage articulations du cadre (axe d'oscillation)",
        },
        {
          categorie: '2. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage des paliers du rouleau vibrant',
        },
        {
          categorie: '2. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage articulations de direction',
        },
        { categorie: '2. GRAISSAGES & LUBRIFICATION', libelle: 'État général des graisseurs' },
        {
          categorie: '3. SYSTÈME DE VIBRATION',
          libelle: 'Fonctionnement vibration (haute et basse fréquence)',
        },
        {
          categorie: '3. SYSTÈME DE VIBRATION',
          libelle: 'Absence de jeu sur roulements excentriques',
        },
        {
          categorie: '4. BANDAGE (ROULEAU LISSE)',
          libelle: 'Absence de fissures/déformations sur le bandage',
        },
        {
          categorie: '4. BANDAGE (ROULEAU LISSE)',
          libelle: "Système d'arrosage du bandage fonctionnel",
        },
        {
          categorie: '5. SYSTÈME HYDRAULIQUE',
          libelle: 'Absence de fuites sur flexibles et vérins',
        },
        {
          categorie: '6. MOTEUR & ALIMENTATION',
          libelle: 'État général du moteur (fuites, bruit, fumée)',
        },
        { categorie: '6. MOTEUR & ALIMENTATION', libelle: 'État du filtre à air' },
        { categorie: '7. SÉCURITÉ', libelle: 'Klaxon, éclairage, gyrophare et signaux de recul' },
        { categorie: '7. SÉCURITÉ', libelle: 'ROPS/FOPS : intégrité structure de protection' },
        { categorie: '8. CONFORMITÉ GÉNÉRALE', libelle: 'Conformité des consommables Shantui' },
        { categorie: '8. CONFORMITÉ GÉNÉRALE', libelle: 'Respect des intervalles (carnet à jour)' },
      ];
    }

    // Rouleau Pieds de Mouton SR18
    if (modele.includes('sr18') || modele.includes('pieds de mouton')) {
      return [
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile moteur' },
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile hydraulique' },
        { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile boîte de transmission' },
        { categorie: '2. GRAISSAGES & LUBRIFICATION', libelle: 'Graissage articulations du cadre' },
        {
          categorie: '2. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage des paliers du rouleau vibrant',
        },
        {
          categorie: '2. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage articulations de direction',
        },
        {
          categorie: '3. SYSTÈME DE VIBRATION',
          libelle: 'Fonctionnement vibration (haute et basse fréquence)',
        },
        {
          categorie: '3. SYSTÈME DE VIBRATION',
          libelle: 'Absence de jeu sur roulements excentriques',
        },
        {
          categorie: '4. PIEDS DE MOUTON',
          libelle: 'État des tampons : absence de casse ou déformation',
        },
        { categorie: '4. PIEDS DE MOUTON', libelle: 'Nombre de tampons complet (aucun manquant)' },
        { categorie: '4. PIEDS DE MOUTON', libelle: 'Absence de colmatage excessif de terre' },
        {
          categorie: '5. SYSTÈME HYDRAULIQUE',
          libelle: 'Absence de fuites sur flexibles et vérins',
        },
        { categorie: '6. SÉCURITÉ', libelle: 'Klaxon, éclairage, gyrophare fonctionnels' },
        { categorie: '6. SÉCURITÉ', libelle: 'ROPS/FOPS : intégrité structure conducteur' },
        { categorie: '7. CONFORMITÉ GÉNÉRALE', libelle: 'Conformité des consommables Shantui' },
        { categorie: '7. CONFORMITÉ GÉNÉRALE', libelle: 'Respect des intervalles (carnet à jour)' },
      ];
    }

    // Recycleuse DGL530
    if (modele.includes('dgl') || modele.includes('recycl')) {
      return [
        {
          categorie: '1. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage des articulations de direction',
        },
        {
          categorie: '1. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage des articulations du châssis et essieux',
        },
        { categorie: '1. GRAISSAGES & LUBRIFICATION', libelle: 'État général des graisseurs' },
        { categorie: '2. OUTILS DE TRAVAIL', libelle: 'État des picots' },
        {
          categorie: '2. OUTILS DE TRAVAIL',
          libelle: 'Absence de fuites sur flexibles, vérins et raccords',
        },
        { categorie: '3. CONFORMITÉ GÉNÉRALE', libelle: 'Respect des intervalles de maintenance' },
        {
          categorie: '3. CONFORMITÉ GÉNÉRALE',
          libelle: 'Conformité consommables (huiles, filtres, graisse)',
        },
      ];
    }

    // Bétonnière JCB40
    if (modele.includes('jcb') || modele.includes('bétonn') || modele.includes('betonn')) {
      return [
        {
          categorie: '1. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage des paliers et articulations de la cuve',
        },
        {
          categorie: '1. GRAISSAGES & LUBRIFICATION',
          libelle: 'Graissage des articulations de direction',
        },
        { categorie: '1. GRAISSAGES & LUBRIFICATION', libelle: 'État général des graisseurs' },
        {
          categorie: '1. GRAISSAGES & LUBRIFICATION',
          libelle: "Graissage de la couronne et pignon d'entraînement de cuve",
        },
        { categorie: '1. GRAISSAGES & LUBRIFICATION', libelle: 'Graissage des demis arbres' },
        { categorie: '1. GRAISSAGES & LUBRIFICATION', libelle: "Niveau d'huile de transmission" },
        {
          categorie: '2. CUVE MALAXEUSE',
          libelle: 'Contrôle motoréducteur (bruit, fuite, fixation)',
        },
        { categorie: '2. CUVE MALAXEUSE', libelle: "Niveau d'huile du réducteur" },
        {
          categorie: '3. CONFORMITÉ GÉNÉRALE',
          libelle: 'Respect des intervalles de maintenance (carnet à jour)',
        },
        { categorie: '3. CONFORMITÉ GÉNÉRALE', libelle: 'Conformité consommables' },
      ];
    }

    // Camion SHACMAN H3000 (et autres camions)
    if (v.typeVehicule === 'CAMION') {
      const points: PointTemplate[] = [
        {
          categorie: '1. CONTRÔLE DES GRAISSAGES',
          libelle: 'Graissage des arbres de transmission et des cardans',
        },
        {
          categorie: '1. CONTRÔLE DES GRAISSAGES',
          libelle: 'État général des graisseurs (propres, non bouchés)',
        },
        {
          categorie: '2. ROULEMENT, SUSPENSION & PNEUMATIQUES',
          libelle: "Vérification de l'état, usure et pression des pneumatiques",
        },
        {
          categorie: '2. ROULEMENT, SUSPENSION & PNEUMATIQUES',
          libelle: 'Contrôle visuel des lames de suspension et amortisseurs',
        },
        {
          categorie: '2. ROULEMENT, SUSPENSION & PNEUMATIQUES',
          libelle: 'Serrage des écrous de roues (absence de fuite moyeu)',
        },
        {
          categorie: '2. ROULEMENT, SUSPENSION & PNEUMATIQUES',
          libelle: "Contrôle système de freinage pneumatique (fuite d'air, garnitures)",
        },
      ];
      // Camion citerne
      if (modele.includes('citern') || modele.includes('eau')) {
        points.push(
          {
            categorie: '3. CITERNE & HYDRAULIQUE EAU',
            libelle: 'Étanchéité de la citerne (absence de fuites/soudures)',
          },
          {
            categorie: '3. CITERNE & HYDRAULIQUE EAU',
            libelle: 'État des vannes, robinets et raccords',
          },
          { categorie: '3. CITERNE & HYDRAULIQUE EAU', libelle: 'Pompe à eau : fonctionnement' },
          {
            categorie: '3. CITERNE & HYDRAULIQUE EAU',
            libelle: 'Buses et rampes de pulvérisation',
          },
          {
            categorie: '3. CITERNE & HYDRAULIQUE EAU',
            libelle: "Tuyau d'aspiration et filtre crépine",
          },
        );
      }
      // Camion grue
      if (modele.includes('grue') || modele.includes('levage')) {
        points.push(
          {
            categorie: '3. SYSTÈME DE LEVAGE & GRUE',
            libelle: 'Graissage du pivot et des articulations de grue',
          },
          { categorie: '3. SYSTÈME DE LEVAGE & GRUE', libelle: 'État de la flèche' },
          { categorie: '3. SYSTÈME DE LEVAGE & GRUE', libelle: 'Cales de sécurité présentes' },
          {
            categorie: '3. SYSTÈME DE LEVAGE & GRUE',
            libelle: 'Pression hydraulique et absence de fuites',
          },
          {
            categorie: '3. SYSTÈME DE LEVAGE & GRUE',
            libelle: 'Stabilisateurs / béquilles fonctionnels',
          },
        );
      }
      points.push(
        {
          categorie: '4. CONFORMITÉ GÉNÉRALE',
          libelle: 'Conformité des consommables (huiles, filtres, graisse)',
        },
        {
          categorie: '4. CONFORMITÉ GÉNÉRALE',
          libelle: 'Respect des intervalles de maintenances préventives',
        },
      );
      return points;
    }

    // Voiture / JMC (pickup) / générique voiture
    if (v.typeVehicule === 'VOITURE') {
      return [
        {
          categorie: '1. CONTRÔLE DES VIDANGES',
          libelle: 'Vidange huile moteur effectuée selon intervalle 5 000 km',
        },
        {
          categorie: '1. CONTRÔLE DES VIDANGES',
          libelle: 'Éléments filtrant utilisé à chaque maintenance',
        },
        {
          categorie: '1. CONTRÔLE DES VIDANGES',
          libelle: 'Liquide de refroidissement niveau correct',
        },
        {
          categorie: '1. CONTRÔLE DES VIDANGES',
          libelle: "Niveau d'huile boîte de vitesses / différentiel",
        },
        {
          categorie: '1. CONTRÔLE DES VIDANGES',
          libelle: "Carnet de bord / carnet d'entretien à jour",
        },
        {
          categorie: '2. CONTRÔLE DES GRAISSAGES',
          libelle: 'Graissage des rotules de direction (biellettes, rotules sup/inf)',
        },
        {
          categorie: '2. CONTRÔLE DES GRAISSAGES',
          libelle: 'Graissage des cardans et croisillons',
        },
        {
          categorie: '3. ENTRETIEN GÉNÉRAL',
          libelle: 'Usure bande de roulement (profondeur conforme, min 1.6 mm)',
        },
        {
          categorie: '3. ENTRETIEN GÉNÉRAL',
          libelle: "Aucun voyant d'alerte allumé au tableau de bord",
        },
      ];
    }

    // Engin TP / Equipement Spécial générique
    return [
      { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile moteur (jauge)' },
      { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau liquide de refroidissement' },
      { categorie: '1. CONTRÔLE DES NIVEAUX', libelle: 'Niveau huile hydraulique (réservoir)' },
      {
        categorie: '2. GRAISSAGES & LUBRIFICATION',
        libelle: 'Graissage (points définis fabricant)',
      },
      {
        categorie: '2. GRAISSAGES & LUBRIFICATION',
        libelle: 'État général des graisseurs (propres, non bouchés)',
      },
      {
        categorie: '3. MOTEUR & ALIMENTATION',
        libelle: 'Contrôle état général du moteur (fuites, bruit, fumée)',
      },
      {
        categorie: '3. MOTEUR & ALIMENTATION',
        libelle: 'État du filtre à air (nettoyage ou remplacement si obstrué)',
      },
      {
        categorie: '4. CONFORMITÉ GÉNÉRALE',
        libelle: 'Conformité des consommables (huiles, filtres, graisse)',
      },
      {
        categorie: '4. CONFORMITÉ GÉNÉRALE',
        libelle: 'Respect des intervalles de maintenance (carnet à jour)',
      },
    ];
  }

  private creerItem(vals?: Partial<PointTemplate>) {
    return this.fb.group({
      categorie: [vals?.categorie ?? '', Validators.required],
      libelle: [vals?.libelle ?? '', Validators.required],
      resultat: ['OK', Validators.required],
      observation: [''],
    });
  }

  ajouterItem() {
    this.itemsArray.push(this.creerItem());
  }
  supprimerItem(i: number) {
    this.retirerPhoto(this.itemsArray.at(i));
    this.itemsArray.removeAt(i);
  }

  /** Marque tous les points comme conformes (cas le plus courant) */
  toutConforme() {
    this.itemsArray.controls.forEach((c) => c.get('resultat')?.setValue('OK'));
  }

  compte(r: 'OK' | 'KO' | 'NA'): number {
    return this.itemsArray.controls.filter((c) => c.get('resultat')?.value === r).length;
  }

  /** Note proposée : part des points conformes parmi les points évalués, sur 20 */
  noteProposee(): number | null {
    const ok = this.compte('OK');
    const ko = this.compte('KO');
    return ok + ko ? Math.round((ok / (ok + ko)) * 20) : null;
  }

  appliquerNoteProposee() {
    const n = this.noteProposee();
    if (n !== null) this.form.get('noteGlobale')?.setValue(n);
  }

  niveauNote(n: number) {
    return n >= 16 ? 'Très bon état' : n >= 12 ? 'Satisfaisant' : n >= 8 ? 'À surveiller' : 'Mauvais état';
  }

  noteClasse(n: number) {
    return n >= 16 ? 'bg-green-50 text-green-700 ring-green-600/20'
      : n >= 12 ? 'bg-lime-50 text-lime-700 ring-lime-600/20'
      : n >= 8 ? 'bg-amber-50 text-amber-800 ring-amber-600/25'
      : 'bg-red-50 text-red-700 ring-red-600/20';
  }

  debutCategorie(i: number): boolean {
    return i === 0 || this.itemsArray.at(i).get('categorie')?.value !== this.itemsArray.at(i - 1).get('categorie')?.value;
  }

  // ── Photos ──────────────────────────────────────────────────────────────
  photoDe(item: AbstractControl) {
    return this.photos().get(item) ?? null;
  }

  choisirPhoto(item: AbstractControl, event: Event) {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    const probleme = verifierFichier(fichier, true);
    if (probleme) {
      this.toast.error(probleme);
      return;
    }
    this.retirerPhoto(item);
    const m = new Map(this.photos());
    m.set(item, { fichier, apercu: URL.createObjectURL(fichier) });
    this.photos.set(m);
  }

  retirerPhoto(item: AbstractControl) {
    const actuelle = this.photos().get(item);
    if (!actuelle) return;
    URL.revokeObjectURL(actuelle.apercu);
    const m = new Map(this.photos());
    m.delete(item);
    this.photos.set(m);
  }

  resultatClass(r: string): string {
    return r === 'OK' ? 'text-green-700' : r === 'KO' ? 'text-red-700' : 'text-gray-500';
  }

  soumettre() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erreurServeur.set('');
    const val = this.form.value as any;
    const payload: any = {
      ...val,
      vehiculeId: Number(val.vehiculeId),
    };
    if (!payload.kilometrageReleve) delete payload.kilometrageReleve;
    if (!payload.heuresMoteurReleve) delete payload.heuresMoteurReleve;
    if (payload.noteGlobale === null || payload.noteGlobale === '') delete payload.noteGlobale;
    // Points à photographier, dans l'ordre du formulaire (même ordre que les points créés)
    const aEnvoyer = this.itemsArray.controls
      .map((c, index) => ({ index, photo: this.photos().get(c) }))
      .filter((x) => !!x.photo);
    this.svc.create(payload).subscribe({
      next: (insp: any) => {
        const crees = [...(insp.items ?? [])].sort((a: any, b: any) => a.id - b.id);
        const envois = aEnvoyer
          .filter((x) => crees[x.index]?.id)
          .map((x) =>
            this.upload.photoInspectionItem(crees[x.index].id, x.photo!.fichier).pipe(catchError(() => of(null))),
          );
        (envois.length ? forkJoin(envois) : of([])).subscribe((res) => {
          const echecs = res.filter((r) => r === null).length;
          if (echecs) this.toast.error(`${echecs} photo(s) n'ont pas pu être envoyées.`);
          if (this.compte('KO')) this.toast.info('Des défauts ont été relevés : un signalement de panne a été créé.');
          this.photos().forEach((p) => URL.revokeObjectURL(p.apercu));
          this.router.navigate(['/inspections', insp.id]);
        });
      },
      error: (err) => {
        this.erreurServeur.set(err?.error?.message ?? "Erreur lors de l'enregistrement.");
        this.loading.set(false);
      },
    });
  }
}
