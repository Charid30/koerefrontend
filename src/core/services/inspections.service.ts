import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Inspection } from '../models/inspection.model';
import { PaginatedResponse } from '../models/vehicule.model';

export interface InspectionFilters {
  vehiculeId?: number;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class InspectionsService {
  constructor(private api: ApiService) {}

  getAll(filters: InspectionFilters = {}) {
    const params: Record<string, any> = {};
    if (filters.vehiculeId) params['vehiculeId'] = filters.vehiculeId;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;
    return this.api.get<PaginatedResponse<Inspection>>('/inspections', params);
  }

  getOne(id: number) {
    return this.api.get<Inspection>(`/inspections/${id}`);
  }

  create(data: any) {
    return this.api.post<Inspection>('/inspections', data);
  }

  update(id: number, data: { notes?: string; statut?: string }) {
    return this.api.patch<Inspection>(`/inspections/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<void>(`/inspections/${id}`);
  }
}
