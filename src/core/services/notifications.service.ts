import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Notification } from '../models/notification.model';
import { PaginatedResponse } from '../models/vehicule.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private api: ApiService) {}

  getMes(page = 1, limit = 30) {
    return this.api.get<PaginatedResponse<Notification>>('/notifications', { page, limit });
  }

  marquerLu(id: number) {
    return this.api.patch<Notification>(`/notifications/${id}/lire`);
  }

  marquerToutLu() {
    return this.api.patch<void>('/notifications/tout-lire');
  }
}
