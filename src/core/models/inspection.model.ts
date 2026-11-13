export type TypeInspection = 'PRE_DEPART' | 'PERIODIQUE' | 'RETOUR_MISSION' | 'TECHNIQUE';
export type StatutInspection = 'CONFORME' | 'NON_CONFORME' | 'PARTIEL';
export type ResultatItem = 'OK' | 'KO' | 'NA';

export interface InspectionItem {
  id?: number;
  categorie: string;
  libelle: string;
  resultat: ResultatItem;
  observation?: string;
}

export interface Inspection {
  id: number;
  vehiculeId: number;
  inspecteurId: number;
  typeInspection: TypeInspection;
  dateInspection: string;
  statut: StatutInspection;
  kilometrageReleve?: number;
  heuresMoteurReleve?: number;
  noteGlobale?: number | null;
  notes?: string;
  createdAt: string;
  vehicule?: { numeroInterne: string; marque: string; modele: string; numeroSerie?: string };
  inspecteur?: { nom: string; prenom: string };
  items?: InspectionItem[];
}
