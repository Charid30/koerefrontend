export type TypeVehicule = 'VOITURE' | 'CAMION' | 'EQUIPEMENT_SPECIAL' | 'ENGIN_TP';
export type TypeCarburant = 'ESSENCE' | 'DIESEL' | 'ELECTRIQUE' | 'HYBRIDE' | 'GPL';
export type StatutVehicule =
  | 'DISPONIBLE'
  | 'EN_CIRCULATION'
  | 'EN_MAINTENANCE'
  | 'EN_ATTENTE_REPARATION_EXTERNE'
  | 'EN_ATTENTE_PIECES'
  | 'IMMOBILISE'
  | 'ACCIDENTE'
  | 'HORS_SERVICE';

export interface Vehicule {
  id: number;
  numeroInterne: string;
  immatriculation: string;
  marque: string;
  modele: string;
  typeVehicule: TypeVehicule;
  annee?: number;
  entite?: string;
  departement?: string;
  siteGeographique?: string;
  conducteurHabituelId?: number;
  conducteurHabituel?: { id: number; nom: string; prenom: string };
  statut: StatutVehicule;
  kilometrage: number;
  heuresMoteur: number;
  dateMiseEnService?: string;
  dateAcquisition?: string;
  numeroSerie?: string;
  couleur?: string;
  carburant?: TypeCarburant;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
