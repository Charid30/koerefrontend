import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { RapportsService } from '../../../core/services/rapports.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService, urlFichier, verifierFichier, TYPES_IMAGES } from '../../../core/services/upload.service';
import { Vehicule } from '../../../core/models/vehicule.model';
import { Action } from '../../../core/auth/permissions';
import { OT_STATUT_LABELS, OT_STATUT_CLASSES } from '../../ordres-travail/ot.constants';
import {
  VEHICULE_TYPES, VEHICULE_STATUTS, VEHICULE_CARBURANTS, INSPECTION_TYPES, INSPECTION_STATUTS,
  DI_PRIORITES, DI_STATUTS, vehiculeStatutClasse, vehiculeStatutPoint, inspectionStatutClasse,
  diPrioriteClasse, diStatutClasse, libelle,
} from '../../../shared/libelles';

type Onglet = 'activite' | 'inspections' | 'ot' | 'di' | 'maintenance';

/** Un évènement de la frise chronologique */
interface Evenement {
  date: string;
  genre: 'ot' | 'di' | 'inspection';
  titre: string;
  detail: string;
  badge: string;
  badgeClasse: string;
  lien: any[] | null;
}

const OT_OUVERTS = ['EN_ATTENTE_VALIDATION', 'PLANIFIE', 'EN_COURS', 'EN_ATTENTE_PIECES', 'EN_ATTENTE_PRESTATAIRE', 'TERMINE', 'CONTROLE'];

@Component({
  selector: 'app-vehicule-detail',
  standalone: true,
  imports: [NgClass, RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vehicule-detail.component.html',
})
export class VehiculeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(VehiculesService);
  private rapports = inject(RapportsService);
  private auth = inject(AuthService);
  private upload = inject(UploadService);
  private toast = inject(ToastService);

  readonly typesImages = TYPES_IMAGES;
  readonly urlFichier = urlFichier;

  vehicule = signal<Vehicule | null>(null);
  loading = signal(true);
  historique = signal<any | null>(null);
  onglet = signal<Onglet>('activite');
  envoiPhoto = signal(false);
  readonly today = new Date().toISOString().slice(0, 10);

  readonly onglets = computed(() => {
    const h = this.historique();
    return [
      { id: 'activite' as Onglet, label: 'Activité', n: 0 },
      { id: 'ot' as Onglet, label: 'Ordres de travail', n: h?.ordresTravail?.length ?? 0 },
      { id: 'di' as Onglet, label: 'Signalements', n: h?.demandesIntervention?.length ?? 0 },
      { id: 'inspections' as Onglet, label: 'Inspections', n: h?.inspections?.length ?? 0 },
      { id: 'maintenance' as Onglet, label: 'Préventif', n: h?.plansMaintenances?.length ?? 0 },
    ];
  });

  readonly otOuverts = computed(() =>
    (this.historique()?.ordresTravail ?? []).filter((o: any) => OT_OUVERTS.includes(o.statut)).length,
  );

  readonly coutMaintenance = computed(() =>
    (this.historique()?.ordresTravail ?? []).reduce(
      (t: number, o: any) => t + Number(o.coutPrestataire ?? 0) + Number(o.coutPiecesTotal ?? 0),
      0,
    ),
  );

  readonly prochaineEcheance = computed(() => {
    const plans = (this.historique()?.plansMaintenances ?? []).filter((p: any) => p.prochaineExecutionDate);
    return plans.length ? plans[0] : null;
  });

  /** Frise : OT, signalements et inspections mélangés, du plus récent au plus ancien */
  readonly evenements = computed<Evenement[]>(() => {
    const h = this.historique();
    if (!h) return [];
    const ev: Evenement[] = [
      ...(h.ordresTravail ?? []).map((o: any) => ({
        date: o.createdAt,
        genre: 'ot' as const,
        titre: `${o.numeroOT} · ${o.typeMaintenance === 'PREVENTIVE' ? 'Préventive' : 'Corrective'}`,
        detail: o.description ?? '',
        badge: OT_STATUT_LABELS[o.statut] ?? o.statut,
        badgeClasse: OT_STATUT_CLASSES[o.statut] ?? '',
        lien: ['/ordres-travail', o.id],
      })),
      ...(h.demandesIntervention ?? []).map((d: any) => ({
        date: d.dateSignalement ?? d.createdAt,
        genre: 'di' as const,
        titre: `Panne signalée · ${libelle(DI_PRIORITES, d.priorite)}`,
        detail: `${d.description ?? ''}${d.declarant ? ' — ' + d.declarant.prenom + ' ' + d.declarant.nom : ''}`,
        badge: libelle(DI_STATUTS, d.statut),
        badgeClasse: diStatutClasse(d.statut),
        lien: null,
      })),
      ...(h.inspections ?? []).map((i: any) => ({
        date: i.dateInspection,
        genre: 'inspection' as const,
        titre: `Inspection ${libelle(INSPECTION_TYPES, i.typeInspection).toLowerCase()}`,
        detail: `${i.noteGlobale != null ? 'Note ' + i.noteGlobale + '/20' : ''}${i.inspecteur ? ' · ' + i.inspecteur.prenom + ' ' + i.inspecteur.nom : ''}`,
        badge: libelle(INSPECTION_STATUTS, i.statut),
        badgeClasse: inspectionStatutClasse(i.statut),
        lien: ['/inspections', i.id],
      })),
    ];
    return ev.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 40);
  });

  peut(action: Action) {
    return this.auth.peut(action);
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getOne(id).subscribe({
      next: (v) => {
        this.vehicule.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.vehicule.set(null);
        this.loading.set(false);
      },
    });
    this.svc.getHistorique(id).subscribe({ next: (h) => this.historique.set(h) });
  }

  exporterHistorique() {
    const v = this.vehicule();
    if (v) this.rapports.historiqueVehicule(v.id, v.numeroInterne).subscribe();
  }

  changerPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    const v = this.vehicule();
    if (!fichier || !v) return;
    const probleme = verifierFichier(fichier, true);
    if (probleme) {
      this.toast.error(probleme);
      return;
    }
    this.envoiPhoto.set(true);
    this.upload.photoVehicule(v.id, fichier).subscribe({
      next: (r) => {
        this.vehicule.set({ ...v, photoUrl: r.photoUrl });
        this.envoiPhoto.set(false);
        this.toast.success('Photo mise à jour');
      },
      error: (err) => {
        this.envoiPhoto.set(false);
        this.toast.error(err?.error?.message ?? 'Envoi de la photo impossible.');
      },
    });
  }

  enRetard(date?: string | null) {
    return !!date && date.slice(0, 10) < this.today;
  }

  // Libellés
  typeLabel = (t: string) => libelle(VEHICULE_TYPES, t);
  carburantLabel = (c?: string) => libelle(VEHICULE_CARBURANTS, c);
  statutLabel = (s: string) => libelle(VEHICULE_STATUTS, s);
  statutClass = vehiculeStatutClasse;
  statutPoint = vehiculeStatutPoint;
  otStatutLabel = (s: string) => OT_STATUT_LABELS[s] ?? s;
  otStatutClass = (s: string) => OT_STATUT_CLASSES[s] ?? '';
  inspStatutLabel = (s: string) => libelle(INSPECTION_STATUTS, s);
  inspStatutClass = inspectionStatutClasse;
  inspTypeLabel = (t: string) => libelle(INSPECTION_TYPES, t);
  diPrioriteLabel = (p: string) => libelle(DI_PRIORITES, p);
  diPrioriteClass = diPrioriteClasse;
  diStatutLabel = (s: string) => libelle(DI_STATUTS, s);
  diStatutClass = diStatutClasse;
}
