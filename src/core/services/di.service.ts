import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { DemandeIntervention } from '../models/ot.model';
import { PaginatedResponse } from '../models/vehicule.model';

export interface DiFilters {
  vehiculeId?: number;
  statut?: string;
  priorite?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DiService {
  constructor(private api: ApiService) {}

  getAll(filters: DiFilters = {}) {
    const params: Record<string, any> = {};
    if (filters.vehiculeId) params['vehiculeId'] = filters.vehiculeId;
    if (filters.statut) params['statut'] = filters.statut;
    if (filters.priorite) params['priorite'] = filters.priorite;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;
    return this.api.get<PaginatedResponse<DemandeIntervention>>('/demandes-intervention', params);
  }

  getOne(id: number) {
    return this.api.get<DemandeIntervention>(`/demandes-intervention/${id}`);
  }

  create(data: { vehiculeId: number; description: string; priorite?: string; localisation?: string }) {
    return this.api.post<DemandeIntervention>('/demandes-intervention', data);
  }

  update(id: number, data: { priorite?: string; localisation?: string; description?: string }) {
    return this.api.patch<DemandeIntervention>(`/demandes-intervention/${id}`, data);
  }

  updateStatut(id: number, statut: string) {
    return this.api.patch<DemandeIntervention>(`/demandes-intervention/${id}/statut`, { statut });
  }

  delete(id: number) {
    return this.api.delete<void>(`/demandes-intervention/${id}`);
  }
}
