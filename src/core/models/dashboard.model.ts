export interface KpiVehicules {
  total: number;
  disponibles: number;
  enMaintenance: number;
  immobilises: number;
  enCirculation: number;
}

export interface KpiOT {
  enAttente: number;
  planifies: number;
  enCours: number;
  terminesAujourdhui: number;
}

export interface KpiStock {
  totalReferences: number;
  alertesSeuil: number;
}

export interface KpiDI {
  enAttente: number;
  urgentes: number;
  critiques: number;
}

export interface KpiPerformance {
  tauxDisponibilite: number;
  tauxMaintenabilite: number;
  coutMois: number;
  coutAnnee: number;
  repartitionMois: { preventif: number; correctif: number };
}

export interface GraphOtMois {
  mois: string;
  preventif: number;
  correctif: number;
}

export interface GraphVehiculePanne {
  id: number;
  label: string;
  nbDi: number;
}

export interface DashboardData {
  vehicules: KpiVehicules;
  ordresTravail: KpiOT;
  stock: KpiStock;
  demandesIntervention: KpiDI;
  kpis: KpiPerformance;
  prochainesMaintenances: ProchaineMaintenance[];
  otRecents: OtRecent[];
  graphiques: {
    otParMois: GraphOtMois[];
    vehiculesPannes: GraphVehiculePanne[];
  };
}

export interface ProchaineMaintenance {
  vehiculeId: number;
  vehicule: string;
  typeOperation: string;
  prochaineExecutionDate: string | null;
  prochaineExecutionKm: number | null;
  prochaineExecutionHeures: number | null;
  typeVehicule: string;
  compteurActuel: number;
}

export interface OtRecent {
  id: number;
  numeroOT: string;
  vehicule: string;
  typeMaintenance: string;
  statut: string;
  datePlanifiee: string | null;
}
