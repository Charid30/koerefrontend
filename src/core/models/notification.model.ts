export type TypeNotification =
  | 'MAINTENANCE_ECHEANCE' | 'STOCK_FAIBLE' | 'ANOMALIE_RECURRENTE'
  | 'IMMOBILISATION' | 'OT_AFFECTE' | 'OT_STATUT_CHANGE' | 'DI_CREE' | 'GENERAL';

export interface Notification {
  id: number;
  destinataireId: number;
  type: TypeNotification;
  titre: string;
  message: string;
  lu: boolean;
  lien?: string;
  createdAt: string;
}
