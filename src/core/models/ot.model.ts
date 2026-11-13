export type StatutOT =
  | 'EN_ATTENTE_VALIDATION' | 'PLANIFIE' | 'EN_COURS'
  | 'EN_ATTENTE_PIECES' | 'EN_ATTENTE_PRESTATAIRE'
  | 'TERMINE' | 'CONTROLE' | 'CLOTURE' | 'ANNULE';

export type Priorite = 'FAIBLE' | 'NORMALE' | 'URGENTE' | 'CRITIQUE';
export type StatutDI = 'EN_ATTENTE' | 'PRISE_EN_CHARGE' | 'TRAITEE' | 'REJETEE';

export interface OrdreTravail {
  id: number;
  numeroOT: string;
  vehiculeId: number;
  responsableId: number;
  typeMaintenance: 'PREVENTIVE' | 'CORRECTIVE';
  statut: StatutOT;
  description?: string;
  datePlanifiee?: string;
  dateDebut?: string;
  dateFin?: string;
  prestatireExterne?: string;
  coutPrestataire?: number;
  heuresInternesTotal?: number;
  coutPiecesTotal?: number;
  notesControle?: string;
  createdAt: string;
  vehicule?: { numeroInterne: string; marque: string; modele: string; immatriculation: string; numeroSerie?: string };
  responsable?: { nom: string; prenom: string };
  mecaniciens?: OtMecanicien[];
}

export interface OtMecanicien {
  id: number;
  mecanicienId: number;
  tempsPasse?: number;
  diagnostic?: string;
  travauxEffectues?: string;
  mecanicien?: { nom: string; prenom: string };
}

export interface DemandeIntervention {
  id: number;
  numeroDI: string;
  vehiculeId: number;
  declarantId: number;
  description: string;
  priorite: Priorite;
  statut: StatutDI;
  localisation?: string;
  dateSignalement: string;
  vehicule?: { numeroInterne: string; marque: string; modele: string; numeroSerie?: string };
  declarant?: { nom: string; prenom: string };
}
