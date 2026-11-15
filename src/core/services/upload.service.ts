import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

export type TypePhotoOT = 'AVANT' | 'APRES' | 'PIECE';

/** Taille maximale acceptée par l'API (10 Mo) */
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;
export const TYPES_ACCEPTES = 'image/jpeg,image/png,image/webp,application/pdf';
export const TYPES_IMAGES = 'image/jpeg,image/png,image/webp';

/** Adresse complète d'un fichier envoyé (/uploads/…), que l'API soit sur le même domaine ou non */
export function urlFichier(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return environment.apiUrl.replace(/\/api\/?$/, '') + url;
}

export function estPdf(url?: string | null): boolean {
  return !!url && url.toLowerCase().endsWith('.pdf');
}

/** Vérifie un fichier avant l'envoi ; renvoie un message d'erreur ou null */
export function verifierFichier(file: File, imagesSeulement = false): string | null {
  const types = (imagesSeulement ? TYPES_IMAGES : TYPES_ACCEPTES).split(',');
  if (!types.includes(file.type)) {
    return imagesSeulement ? 'Choisissez une image (jpg, png ou webp).' : 'Format non supporté (jpg, png, webp ou pdf).';
  }
  if (file.size > TAILLE_MAX_FICHIER) return 'Le fichier dépasse 10 Mo.';
  return null;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private api = inject(ApiService);

  private formulaire(file: File, extra: Record<string, string> = {}) {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    return fd;
  }

  photoOt(otId: number, file: File, type: TypePhotoOT) {
    return this.api.post<{ id: number; url: string; type: TypePhotoOT }>(`/upload/ot/${otId}/photo`, this.formulaire(file, { type }));
  }

  supprimerPhotoOt(photoId: number) {
    return this.api.delete(`/upload/ot/photo/${photoId}`);
  }

  photoDi(diId: number, file: File) {
    return this.api.post<{ id: number; url: string }>(`/upload/di/${diId}/photo`, this.formulaire(file));
  }

  supprimerPhotoDi(photoId: number) {
    return this.api.delete(`/upload/di/photo/${photoId}`);
  }

  photoInspectionItem(itemId: number, file: File) {
    return this.api.post<{ id: number; photoUrl: string }>(`/upload/inspection-item/${itemId}/photo`, this.formulaire(file));
  }

  photoVehicule(vehiculeId: number, file: File) {
    return this.api.post<{ id: number; photoUrl: string }>(`/upload/vehicule/${vehiculeId}/photo`, this.formulaire(file));
  }
}
