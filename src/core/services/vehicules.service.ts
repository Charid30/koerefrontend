import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Vehicule, PaginatedResponse } from '../models/vehicule.model';

export interface VehiculeFilters {
  page?: number;
  limit?: number;
  statut?: string;
  typeVehicule?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class VehiculesService {
  constructor(private api: ApiService) {}

  getAll(filters: VehiculeFilters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.statut) params.set('statut', filters.statut);
    if (filters.typeVehicule) params.set('typeVehicule', filters.typeVehicule);
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.api.get<PaginatedResponse<Vehicule>>(`/vehicules${qs ? '?' + qs : ''}`);
  }

  getOne(id: number) {
    return this.api.get<Vehicule>(`/vehicules/${id}`);
  }

  create(data: Partial<Vehicule>) {
    return this.api.post<Vehicule>('/vehicules', data);
  }

  update(id: number, data: Partial<Vehicule>) {
    // L'API expose PUT /vehicules/:id (un PATCH renvoyait 404)
    return this.api.put<Vehicule>(`/vehicules/${id}`, data);
  }

  getHistorique(id: number) {
    return this.api.get<any>(`/vehicules/${id}/historique`);
  }

  delete(id: number) {
    return this.api.delete<void>(`/vehicules/${id}`);
  }

  getEntites() {
    return this.api.get<string[]>('/vehicules/entites');
  }
}
