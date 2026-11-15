import { Component, inject, signal, computed, HostListener, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationsService } from '../../core/services/notifications.service';

/** Titre affiché dans la barre selon la première partie de l'adresse */
const TITRES: Record<string, string> = {
  'tableau-de-bord': 'Tableau de bord',
  vehicules: 'Parc véhicules',
  inspections: 'Inspections',
  'demandes-intervention': 'Signalements de panne',
  'ordres-travail': 'Ordres de travail',
  maintenance: 'Maintenance préventive',
  stocks: 'Stocks & pièces',
  amdec: 'Analyse AMDEC',
  rapports: 'Rapports',
  administration: 'Utilisateurs',
  notifications: 'Notifications',
  profil: 'Mon profil',
  'application-mobile': 'Application mobile',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifications = inject(NotificationsService);
  readonly layout = inject(LayoutService);
  readonly theme = inject(ThemeService);
  readonly user = this.auth.user;

  menuOuvert = signal(false);
  nonLues = signal(0);
  private url = signal(this.router.url);

  readonly titre = computed(() => {
    const segment = this.url().split('?')[0].split('/').filter(Boolean)[0] ?? 'tableau-de-bord';
    return TITRES[segment] ?? 'SOFARY';
  });

  readonly initiales = computed(() => {
    const u = this.user();
    return `${u?.prenom?.[0] ?? ''}${u?.nom?.[0] ?? ''}`.toUpperCase();
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(destroyRef))
      .subscribe((e) => {
        this.url.set((e as NavigationEnd).urlAfterRedirects);
        this.menuOuvert.set(false);
      });

    // Compteur de notifications non lues, rafraîchi toutes les minutes et à chaque navigation
    interval(60_000)
      .pipe(
        startWith(0),
        switchMap(() => this.notifications.getMes(1, 1).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((r: any) => {
        if (r && typeof r.nonLues === 'number') this.nonLues.set(r.nonLues);
      });
  }

  toggleMenu() {
    this.menuOuvert.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (!el.closest('[data-profil-menu]')) this.menuOuvert.set(false);
  }

  @HostListener('document:keydown.escape')
  onEchap() {
    this.menuOuvert.set(false);
  }

  deconnecter() {
    this.auth.logout();
  }
}
