import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models/user.model';
import { PaginatedResponse } from '../models/vehicule.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private api: ApiService) {}

  getAll(page = 1, limit = 20) {
    return this.api.get<PaginatedResponse<User>>('/users', { page, limit });
  }

  getOne(id: number) {
    return this.api.get<User>(`/users/${id}`);
  }

  create(data: any) {
    return this.api.post<User>('/users', data);
  }

  update(id: number, data: any) {
    return this.api.put<User>(`/users/${id}`, data);
  }

  toggleActif(id: number) {
    return this.api.patch<User>(`/users/${id}/toggle-actif`);
  }

  resetMotDePasse(id: number, nouveauMotDePasse: string) {
    return this.api.patch<{ message: string }>(`/users/${id}/reset-mot-de-passe`, { nouveauMotDePasse });
  }

  changerMotDePasse(motDePasseActuel: string, nouveauMotDePasse: string) {
    return this.api.patch<{ message: string }>('/auth/changer-mot-de-passe', { motDePasseActuel, nouveauMotDePasse });
  }
}
