export const OT_STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE_VALIDATION:   'En attente',
  PLANIFIE:                'Planifié',
  EN_COURS:                'En cours',
  EN_ATTENTE_PIECES:       'Att. pièces',
  EN_ATTENTE_PRESTATAIRE:  'Att. prestataire',
  TERMINE:                 'Terminé',
  CONTROLE:                'Contrôle',
  CLOTURE:                 'Clôturé',
  ANNULE:                  'Annulé',
};

export const OT_STATUT_CLASSES: Record<string, string> = {
  EN_ATTENTE_VALIDATION:   'bg-amber-50 text-amber-800 ring-amber-600/25',
  PLANIFIE:                'bg-blue-50 text-blue-700 ring-blue-600/20',
  EN_COURS:                'bg-primary-50 text-primary-700 ring-primary-600/20',
  EN_ATTENTE_PIECES:       'bg-orange-50 text-orange-700 ring-orange-600/20',
  EN_ATTENTE_PRESTATAIRE:  'bg-orange-50 text-orange-700 ring-orange-600/20',
  TERMINE:                 'bg-green-50 text-green-700 ring-green-600/20',
  CONTROLE:                'bg-teal-50 text-teal-700 ring-teal-600/20',
  CLOTURE:                 'bg-gray-100 text-gray-600 ring-gray-500/20',
  ANNULE:                  'bg-red-50 text-red-700 ring-red-600/20',
};

export const OT_STATUT_POINTS: Record<string, string> = {
  EN_ATTENTE_VALIDATION:   'bg-amber-500',
  PLANIFIE:                'bg-blue-500',
  EN_COURS:                'bg-primary-500',
  EN_ATTENTE_PIECES:       'bg-orange-500',
  EN_ATTENTE_PRESTATAIRE:  'bg-orange-500',
  TERMINE:                 'bg-green-500',
  CONTROLE:                'bg-teal-500',
  CLOTURE:                 'bg-gray-400',
  ANNULE:                  'bg-red-500',
};

// Machine à états : copie exacte des transitions acceptées par l'API
// (ordres-travail.service.ts) — un bouton hors de cette liste renverrait une erreur 400.
export const OT_TRANSITIONS: Record<string, string[]> = {
  EN_ATTENTE_VALIDATION:  ['PLANIFIE', 'ANNULE'],
  PLANIFIE:               ['EN_COURS', 'ANNULE'],
  EN_COURS:               ['EN_ATTENTE_PIECES', 'EN_ATTENTE_PRESTATAIRE', 'TERMINE'],
  EN_ATTENTE_PIECES:      ['EN_COURS'],
  EN_ATTENTE_PRESTATAIRE: ['EN_COURS', 'TERMINE'],
  TERMINE:                ['CONTROLE'],
  CONTROLE:               ['CLOTURE'],
  CLOTURE:                [],
  ANNULE:                 [],
};

/** Étapes principales du cycle de vie, pour le suivi visuel de la fiche OT */
export const OT_ETAPES = [
  { statut: 'EN_ATTENTE_VALIDATION', label: 'Validation' },
  { statut: 'PLANIFIE', label: 'Planifié' },
  { statut: 'EN_COURS', label: 'En cours' },
  { statut: 'TERMINE', label: 'Terminé' },
  { statut: 'CONTROLE', label: 'Contrôle' },
  { statut: 'CLOTURE', label: 'Clôturé' },
];

/** Position d'un statut dans les étapes (les attentes comptent comme « En cours ») */
export function indexEtape(statut: string): number {
  if (statut === 'EN_ATTENTE_PIECES' || statut === 'EN_ATTENTE_PRESTATAIRE') return 2;
  return OT_ETAPES.findIndex((e) => e.statut === statut);
}
