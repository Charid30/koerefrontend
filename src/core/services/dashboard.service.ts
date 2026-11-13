import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { DashboardData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getData() {
    return this.api.get<DashboardData>('/dashboard');
  }
}
