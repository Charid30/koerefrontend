import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgClass, DatePipe } from '@angular/common';
import { NotificationsService } from '../../core/services/notifications.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NgClass, DatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  private svc = inject(NotificationsService);

  notifications = signal<Notification[]>([]);
  loading = signal(true);
  nonLues = computed(() => this.notifications().filter((n) => !n.lu).length);

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.loading.set(true);
    this.svc.getMes().subscribe({
      next: (r) => {
        this.notifications.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  marquerLu(n: Notification) {
    if (n.lu) return;
    this.svc.marquerLu(n.id).subscribe({
      next: () =>
        this.notifications.update((list) =>
          list.map((x) => (x.id === n.id ? { ...x, lu: true } : x)),
        ),
    });
  }

  toutLire() {
    this.svc.marquerToutLu().subscribe({
      next: () => this.notifications.update((list) => list.map((x) => ({ ...x, lu: true }))),
    });
  }

  typeIcon(type: string): string {
    const m: Record<string, string> = {
      MAINTENANCE_ECHEANCE: '🔧',
      STOCK_FAIBLE: '📦',
      ANOMALIE_RECURRENTE: '⚠️',
      IMMOBILISATION: '🚫',
      OT_AFFECTE: '📋',
      OT_STATUT_CHANGE: '🔄',
      DI_CREE: '🚨',
      GENERAL: 'ℹ️',
    };
    return m[type] ?? 'ℹ️';
  }

  typeClass(type: string): string {
    const m: Record<string, string> = {
      MAINTENANCE_ECHEANCE: 'bg-blue-100',
      STOCK_FAIBLE: 'bg-orange-100',
      ANOMALIE_RECURRENTE: 'bg-yellow-100',
      IMMOBILISATION: 'bg-red-100',
      OT_AFFECTE: 'bg-indigo-100',
      OT_STATUT_CHANGE: 'bg-purple-100',
      DI_CREE: 'bg-red-100',
      GENERAL: 'bg-gray-100',
    };
    return m[type] ?? 'bg-gray-100';
  }
}
