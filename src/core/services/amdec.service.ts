import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AmdecAnalyse } from '../models/amdec.model';

@Injectable({ providedIn: 'root' })
export class AmdecService {
  constructor(private api: ApiService) {}

  getByVehicule(vehiculeId: number) {
    return this.api.get<AmdecAnalyse[]>(`/amdec/vehicule/${vehiculeId}`);
  }

  getMatrice(vehiculeId: number) {
    return this.api.get<any>(`/amdec/vehicule/${vehiculeId}/matrice`);
  }

  create(data: Partial<AmdecAnalyse>) {
    return this.api.post<AmdecAnalyse>('/amdec', data);
  }

  update(id: number, data: Partial<AmdecAnalyse>) {
    return this.api.put<AmdecAnalyse>(`/amdec/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<void>(`/amdec/${id}`);
  }
}
