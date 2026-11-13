export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';

export interface PieceStock {
  id: number;
  reference: string;
  designation: string;
  marque?: string;
  categorie?: string;
  quantiteDisponible: number;
  quantiteMinimum: number;
  unite: string;
  emplacement?: string;
  prixUnitaire?: number;
  notes?: string;
}

export interface MouvementStock {
  id: number;
  pieceId: number;
  agentId: number;
  typeMouvement: TypeMouvement;
  quantite: number;
  prixUnitaire?: number;
  motif?: string;
  dateOperation: string;
  piece?: { reference: string; designation: string };
  agent?: { nom: string; prenom: string };
}
