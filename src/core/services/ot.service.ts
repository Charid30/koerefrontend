import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { OrdreTravail } from '../models/ot.model';
import { PaginatedResponse } from '../models/vehicule.model';

export interface OtFilters {
  statut?: string;
  vehiculeId?: number;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class OtService {
  constructor(private api: ApiService) {}

  getAll(filters: OtFilters = {}) {
    const params: Record<string, any> = {};
    if (filters.statut) params['statut'] = filters.statut;
    if (filters.vehiculeId) params['vehiculeId'] = filters.vehiculeId;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;
    return this.api.get<PaginatedResponse<OrdreTravail>>('/ordres-travail', params);
  }

  getOne(id: number) {
    return this.api.get<OrdreTravail>(`/ordres-travail/${id}`);
  }

  create(data: any) {
    return this.api.post<OrdreTravail>('/ordres-travail', data);
  }

  update(id: number, data: { typeMaintenance?: string; datePlanifiee?: string; prestatireExterne?: string; description?: string }) {
    return this.api.patch<OrdreTravail>(`/ordres-travail/${id}`, data);
  }

  /** Le DTO de l'API nomme la note « notesControle » (un champ « notes » est refusé en 400). */
  updateStatut(id: number, statut: string, notesControle?: string) {
    return this.api.patch<OrdreTravail>(`/ordres-travail/${id}/statut`, { statut, notesControle });
  }

  affecterMecanicien(otId: number, mecanicienId: number) {
    return this.api.post<any>(`/ordres-travail/${otId}/mecaniciens/${mecanicienId}`, {});
  }

  delete(id: number) {
    return this.api.delete<void>(`/ordres-travail/${id}`);
  }
}
