/**
 * Libellés et couleurs partagés par les fiches de détail.
 * Mêmes teintes que les listes : vert = OK, ambre = en attente, rouge = arrêt / critique.
 */

const NEUTRE = 'bg-gray-100 text-gray-600 ring-gray-500/20';

// ── Véhicules ────────────────────────────────────────────────────────────
export const VEHICULE_TYPES: Record<string, string> = {
  VOITURE: 'Voiture',
  CAMION: 'Camion',
  EQUIPEMENT_SPECIAL: 'Équipement spécial',
  ENGIN_TP: 'Engin TP',
};

export const VEHICULE_CARBURANTS: Record<string, string> = {
  DIESEL: 'Diesel',
  ESSENCE: 'Essence',
  ELECTRIQUE: 'Électrique',
  HYBRIDE: 'Hybride',
  GPL: 'GPL',
};

export const VEHICULE_STATUTS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_CIRCULATION: 'En circulation',
  EN_MAINTENANCE: 'En maintenance',
  EN_ATTENTE_REPARATION_EXTERNE: 'Att. réparation ext.',
  EN_ATTENTE_PIECES: 'Att. pièces',
  IMMOBILISE: 'Immobilisé',
  ACCIDENTE: 'Accidenté',
  HORS_SERVICE: 'Hors service',
};

const VEHICULE_TEINTES: Record<string, 'vert' | 'bleu' | 'ambre' | 'rouge' | 'gris'> = {
  DISPONIBLE: 'vert',
  EN_CIRCULATION: 'bleu',
  EN_MAINTENANCE: 'ambre',
  EN_ATTENTE_REPARATION_EXTERNE: 'ambre',
  EN_ATTENTE_PIECES: 'ambre',
  IMMOBILISE: 'rouge',
  ACCIDENTE: 'rouge',
  HORS_SERVICE: 'gris',
};

const BADGES = {
  vert: 'bg-green-50 text-green-700 ring-green-600/20',
  bleu: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  ambre: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  rouge: 'bg-red-50 text-red-700 ring-red-600/20',
  gris: NEUTRE,
};
const POINTS = { vert: 'bg-green-500', bleu: 'bg-blue-500', ambre: 'bg-amber-500', rouge: 'bg-red-500', gris: 'bg-gray-400' };

export const vehiculeStatutClasse = (s: string) => BADGES[VEHICULE_TEINTES[s] ?? 'gris'];
export const vehiculeStatutPoint = (s: string) => POINTS[VEHICULE_TEINTES[s] ?? 'gris'];

// ── Inspections ──────────────────────────────────────────────────────────
export const INSPECTION_TYPES: Record<string, string> = {
  PRE_DEPART: 'Pré-départ',
  PERIODIQUE: 'Périodique',
  RETOUR_MISSION: 'Retour mission',
  TECHNIQUE: 'Technique',
};

export const INSPECTION_STATUTS: Record<string, string> = {
  CONFORME: 'Conforme',
  NON_CONFORME: 'Non conforme',
  PARTIEL: 'Partiel',
};

export const inspectionStatutClasse = (s: string) =>
  s === 'CONFORME' ? BADGES.vert : s === 'NON_CONFORME' ? BADGES.rouge : s === 'PARTIEL' ? BADGES.ambre : NEUTRE;

// ── Signalements de panne (DI) ───────────────────────────────────────────
export const DI_PRIORITES: Record<string, string> = {
  FAIBLE: 'Faible',
  NORMALE: 'Normale',
  URGENTE: 'Urgente',
  CRITIQUE: 'Critique',
};

export const DI_STATUTS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  PRISE_EN_CHARGE: 'Prise en charge',
  TRAITEE: 'Traitée',
  REJETEE: 'Rejetée',
};

export const diPrioriteClasse = (p: string) =>
  p === 'CRITIQUE' ? BADGES.rouge : p === 'URGENTE' ? BADGES.ambre : p === 'NORMALE' ? BADGES.bleu : NEUTRE;

export const diStatutClasse = (s: string) =>
  s === 'EN_ATTENTE' ? BADGES.ambre
  : s === 'PRISE_EN_CHARGE' ? 'bg-primary-50 text-primary-700 ring-primary-600/20'
  : s === 'TRAITEE' ? BADGES.vert
  : NEUTRE;

export const libelle = (table: Record<string, string>, valeur?: string | null) =>
  valeur ? (table[valeur] ?? valeur) : '—';
