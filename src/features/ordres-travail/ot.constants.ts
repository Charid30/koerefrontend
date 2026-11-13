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

// Machine à états — transitions autorisées
export const OT_TRANSITIONS: Record<string, string[]> = {
  EN_ATTENTE_VALIDATION:  ['PLANIFIE', 'ANNULE'],
  PLANIFIE:               ['EN_COURS', 'ANNULE'],
  EN_COURS:               ['EN_ATTENTE_PIECES', 'EN_ATTENTE_PRESTATAIRE', 'TERMINE'],
  EN_ATTENTE_PIECES:      ['EN_COURS', 'ANNULE'],
  EN_ATTENTE_PRESTATAIRE: ['EN_COURS', 'ANNULE'],
  TERMINE:                ['CONTROLE'],
  CONTROLE:               ['CLOTURE', 'EN_COURS'],
  CLOTURE:                [],
  ANNULE:                 [],
};
