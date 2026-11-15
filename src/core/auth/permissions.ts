import { Role } from '../models/user.model';

/**
 * Droits d'action, calqués sur les décorateurs @Roles du backend.
 * Le frontend s'en sert pour n'afficher que les boutons que l'API acceptera :
 * toute modification ici doit suivre la règle correspondante côté API.
 */
export const PERMISSIONS = {
  // vehicules.controller.ts
  'vehicule.creer': ['ADMIN', 'RESPONSABLE_PARC'],
  'vehicule.modifier': ['ADMIN', 'RESPONSABLE_PARC'],
  'vehicule.supprimer': ['ADMIN'],
  // inspections.controller.ts
  'inspection.creer': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'],
  'inspection.modifier': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  'inspection.supprimer': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  // di.controller.ts
  'di.creer': ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'],
  'di.traiter': ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'],
  'di.supprimer': ['ADMIN', 'RESPONSABLE_PARC'],
  // ordres-travail.controller.ts
  'ot.creer': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  'ot.modifier': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  'ot.supprimer': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  'ot.statut': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'],
  'ot.affecter': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  'ot.couts': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'RESPONSABLE_PARC'],
  'ot.travaux': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'],
  // upload.controller.ts
  'ot.photo': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'],
  'ot.photo.supprimer': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  'di.photo': ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'],
  'di.photo.supprimer': ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'],
  'inspection.photo': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'],
  'vehicule.photo': ['ADMIN', 'RESPONSABLE_PARC'],
  // maintenance-preventive.controller.ts
  'maintenance.creer': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'RESPONSABLE_PARC'],
  'maintenance.executer': ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'],
  'maintenance.retirer': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
  // stocks.controller.ts
  'stock.gerer': ['ADMIN', 'DIRECTION'],
  // amdec.controller.ts
  'amdec.gerer': ['ADMIN', 'RESPONSABLE_MAINTENANCE'],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof PERMISSIONS;

export function autorise(role: Role | null | undefined, action: Action): boolean {
  return !!role && (PERMISSIONS[action] as readonly Role[]).includes(role);
}
