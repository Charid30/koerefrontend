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
  EN_ATTENTE_VALIDATION:   'bg-yellow-100 text-yellow-800',
  PLANIFIE:                'bg-blue-100 text-blue-700',
  EN_COURS:                'bg-indigo-100 text-indigo-700',
  EN_ATTENTE_PIECES:       'bg-orange-100 text-orange-700',
  EN_ATTENTE_PRESTATAIRE:  'bg-orange-100 text-orange-700',
  TERMINE:                 'bg-green-100 text-green-700',
  CONTROLE:                'bg-purple-100 text-purple-700',
  CLOTURE:                 'bg-gray-100 text-gray-500',
  ANNULE:                  'bg-red-100 text-red-700',
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
