export type NiveauRisque = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';

export interface AmdecAnalyse {
  id: number;
  vehiculeId: number;
  composant: string;
  modeDefaillance: string;
  effet: string;
  cause: string;
  frequence: number;
  gravite: number;
  detectabilite: number;
  ipr: number;
  actionsRecommandees?: string;
  createdAt: string;
  vehicule?: { numeroInterne: string; marque: string; modele: string };
}
