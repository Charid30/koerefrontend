import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type TypePlan = 'PERIODIQUE' | 'GENERALE';

export interface PlanMaintenance {
  id: number;
  vehiculeId: number;
  typePlan: TypePlan;
  typeOperation: string;
  description?: string;
  frequenceKm?: number;
  frequenceJours?: number;
  frequenceMois?: number;
  derniereExecutionKm?: number;
  derniereExecutionDate?: string;
  prochaineExecutionKm?: number;
  prochaineExecutionDate?: string;
  actif: boolean;
  vehicule?: {
    id: number;
    numeroInterne: string;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage: number;
    heuresMoteur: number;
    typeVehicule: string;
  };
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  constructor(private api: ApiService) {}

  getAll()        { return this.api.get<PlanMaintenance[]>('/maintenance-preventive'); }
  getPeriodique() { return this.api.get<PlanMaintenance[]>('/maintenance-preventive/periodique'); }
  getGenerale()   { return this.api.get<PlanMaintenance[]>('/maintenance-preventive/generale'); }
  getAlertes()    { return this.api.get<PlanMaintenance[]>('/maintenance-preventive/alertes'); }

  create(data: { vehiculeId: number; typePlan: TypePlan; description?: string; derniereExecutionKm?: number; frequenceMois?: number; derniereExecutionDate?: string }) {
    return this.api.post<PlanMaintenance>('/maintenance-preventive', data);
  }

  marquerEffectuee(id: number, kilometrage?: number) {
    return this.api.patch<PlanMaintenance>(`/maintenance-preventive/${id}/execution`, { kilometrage });
  }

  desactiver(id: number) {
    return this.api.delete<PlanMaintenance>(`/maintenance-preventive/${id}`);
  }

  getByVehicule(vehiculeId: number) {
    return this.api.get<PlanMaintenance[]>(`/maintenance-preventive/vehicule/${vehiculeId}`);
  }
}
