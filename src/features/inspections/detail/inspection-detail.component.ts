import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InspectionsService } from '../../../core/services/inspections.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService, urlFichier, verifierFichier, TYPES_IMAGES } from '../../../core/services/upload.service';
import { Inspection, InspectionItem } from '../../../core/models/inspection.model';
import { INSPECTION_TYPES, INSPECTION_STATUTS, inspectionStatutClasse, libelle } from '../../../shared/libelles';

type Filtre = 'tous' | 'KO' | 'OK' | 'NA';

@Component({
  selector: 'app-inspection-detail',
  standalone: true,
  imports: [NgClass, RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspection-detail.component.html',
})
export class InspectionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(InspectionsService);
  private auth = inject(AuthService);
  private upload = inject(UploadService);
  private toast = inject(ToastService);

  readonly typesImages = TYPES_IMAGES;
  readonly urlFichier = urlFichier;

  inspection = signal<Inspection | null>(null);
  loading = signal(true);
  filtre = signal<Filtre>('tous');
  envoiItem = signal<number | null>(null);
  apercu = signal<string | null>(null);

  readonly peutPhoto = computed(() => this.auth.peut('inspection.photo'));

  readonly items = computed(() => this.inspection()?.items ?? []);
  readonly comptes = computed(() => {
    const c = { OK: 0, KO: 0, NA: 0 };
    for (const i of this.items()) c[i.resultat] = (c[i.resultat] ?? 0) + 1;
    return c;
  });

  /** Part des points conformes parmi les points évalués (hors N/A) */
  readonly tauxConformite = computed(() => {
    const { OK, KO } = this.comptes();
    return OK + KO ? Math.round((OK / (OK + KO)) * 100) : null;
  });

  /** Points regroupés par catégorie, défauts en premier dans chaque groupe */
  readonly categories = computed(() => {
    const f = this.filtre();
    const ordre: Record<string, number> = { KO: 0, OK: 1, NA: 2 };
    const groupes = new Map<string, InspectionItem[]>();
    for (const item of this.items()) {
      if (f !== 'tous' && item.resultat !== f) continue;
      const cat = item.categorie || 'Autres';
      groupes.set(cat, [...(groupes.get(cat) ?? []), item]);
    }
    return [...groupes.entries()].map(([nom, liste]) => ({
      nom,
      items: liste.sort((a, b) => ordre[a.resultat] - ordre[b.resultat]),
      defauts: liste.filter((i) => i.resultat === 'KO').length,
    }));
  });

  ngOnInit() {
    this.charger();
  }

  private charger() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getOne(id).subscribe({
      next: (i) => {
        this.inspection.set(i);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ajouterPhoto(item: InspectionItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier || !item.id) return;
    const probleme = verifierFichier(fichier, true);
    if (probleme) {
      this.toast.error(probleme);
      return;
    }
    this.envoiItem.set(item.id);
    this.upload.photoInspectionItem(item.id, fichier).subscribe({
      next: (r) => {
        this.envoiItem.set(null);
        this.inspection.update((insp) =>
          insp ? { ...insp, items: insp.items?.map((i) => (i.id === item.id ? { ...i, photoUrl: r.photoUrl } : i)) } : insp,
        );
        this.toast.success('Photo ajoutée');
      },
      error: (err) => {
        this.envoiItem.set(null);
        this.toast.error(err?.error?.message ?? 'Envoi de la photo impossible.');
      },
    });
  }

  niveauNote(n: number) {
    return n >= 16 ? 'Très bon état' : n >= 12 ? 'Satisfaisant' : n >= 8 ? 'À surveiller' : 'Mauvais état';
  }
  couleurNote(n: number) {
    return n >= 16 ? 'text-green-600' : n >= 12 ? 'text-lime-600' : n >= 8 ? 'text-amber-600' : 'text-red-600';
  }
  traitNote(n: number) {
    return n >= 16 ? 'stroke-green-500' : n >= 12 ? 'stroke-lime-500' : n >= 8 ? 'stroke-amber-500' : 'stroke-red-500';
  }
  /** Longueur de l'arc de la jauge (circonférence 2πr avec r = 42) */
  arc(n: number) {
    const c = 2 * Math.PI * 42;
    return `${(Math.max(0, Math.min(20, n)) / 20) * c} ${c}`;
  }

  typeLabel = (t: string) => libelle(INSPECTION_TYPES, t);
  statutLabel = (s: string) => libelle(INSPECTION_STATUTS, s);
  statutClass = inspectionStatutClasse;
}
