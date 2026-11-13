import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationsService } from '../../core/services/notifications.service';
import { Notification } from '../../core/models/notification.model';

type Filtre = 'toutes' | 'non-lues';

interface Groupe {
  titre: string;
  items: Notification[];
}

/** Apparence par type : icône (tracé SVG) et teinte de la pastille. */
const TYPES: Record<string, { icone: string; teinte: string; libelle: string }> = {
  MAINTENANCE_ECHEANCE: {
    libelle: 'Maintenance',
    teinte: 'bg-primary-50 text-primary-600',
    icone: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  STOCK_FAIBLE: {
    libelle: 'Stock',
    teinte: 'bg-amber-50 text-amber-600',
    icone: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  },
  ANOMALIE_RECURRENTE: {
    libelle: 'Anomalie',
    teinte: 'bg-amber-50 text-amber-600',
    icone: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  IMMOBILISATION: {
    libelle: 'Immobilisation',
    teinte: 'bg-red-50 text-red-600',
    icone: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  },
  OT_AFFECTE: {
    libelle: 'Ordre de travail',
    teinte: 'bg-blue-50 text-blue-600',
    icone: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  OT_STATUT_CHANGE: {
    libelle: 'Ordre de travail',
    teinte: 'bg-blue-50 text-blue-600',
    icone: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
  DI_CREE: {
    libelle: 'Panne signalée',
    teinte: 'bg-red-50 text-red-600',
    icone: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  GENERAL: {
    libelle: 'Information',
    teinte: 'bg-gray-100 text-gray-600',
    icone: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

@Component({
  selector: 'app-notifications',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  private readonly svc = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(true);
  readonly filtre = signal<Filtre>('toutes');

  readonly nonLues = computed(() => this.notifications().filter((n) => !n.lu).length);

  readonly visibles = computed(() =>
    this.filtre() === 'non-lues' ? this.notifications().filter((n) => !n.lu) : this.notifications(),
  );

  /** Regroupement par période, du plus récent au plus ancien. */
  readonly groupes = computed<Groupe[]>(() => {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const hier = debutJour.getTime() - 86_400_000;
    const semaine = debutJour.getTime() - 6 * 86_400_000;
    const groupes: Groupe[] = [
      { titre: 'Aujourd’hui', items: [] },
      { titre: 'Hier', items: [] },
      { titre: 'Cette semaine', items: [] },
      { titre: 'Plus ancien', items: [] },
    ];
    const tries = [...this.visibles()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    for (const n of tries) {
      const t = new Date(n.createdAt).getTime();
      const i = t >= debutJour.getTime() ? 0 : t >= hier ? 1 : t >= semaine ? 2 : 3;
      groupes[i].items.push(n);
    }
    return groupes.filter((g) => g.items.length);
  });

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

  /** Marque comme lue puis ouvre la page liée, s'il y en a une. */
  ouvrir(n: Notification) {
    this.marquerLu(n);
    if (n.lien) this.router.navigateByUrl(n.lien);
  }

  marquerLu(n: Notification) {
    if (n.lu) return;
    this.svc.marquerLu(n.id).subscribe({
      next: () =>
        this.notifications.update((list) => list.map((x) => (x.id === n.id ? { ...x, lu: true } : x))),
    });
  }

  toutLire() {
    this.svc.marquerToutLu().subscribe({
      next: () => this.notifications.update((list) => list.map((x) => ({ ...x, lu: true }))),
    });
  }

  type(t: string) {
    return TYPES[t] ?? TYPES['GENERAL'];
  }

  /** « il y a 5 min », « hier », « 12 nov. »… */
  quand(date: string): string {
    const diff = (new Date(date).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    if (abs < 60) return 'À l’instant';
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 7 * 86_400) return rtf.format(Math.round(diff / 86_400), 'day');
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  }
}
