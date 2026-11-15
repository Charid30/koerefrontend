import { Component, computed, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

interface NavGroupe {
  titre: string;
  items: NavItem[];
}

const CLE_REPLI = 'sofary_menu_replie';

function lireRepli(): boolean {
  try {
    return localStorage.getItem(CLE_REPLI) === '1';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  private router = inject(Router);

  readonly user = this.auth.user;
  readonly role = this.auth.role;

  /** Menu réduit aux icônes (ordinateur uniquement), mémorisé d'une visite à l'autre */
  collapsed = signal(lireRepli());

  // Les rôles reprennent exactement les gardes de app.routes.ts
  readonly groupes: NavGroupe[] = [
    {
      titre: 'Pilotage',
      items: [
        { label: 'Tableau de bord', icon: 'grid', route: '/tableau-de-bord' },
        { label: 'Rapports', icon: 'download', route: '/rapports', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'DIRECTION'] },
        { label: 'Analyse AMDEC', icon: 'chart-bar', route: '/amdec', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'] },
      ],
    },
    {
      titre: 'Flotte',
      items: [
        { label: 'Véhicules', icon: 'truck', route: '/vehicules', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'CHAUFFEUR', 'DIRECTION'] },
        { label: 'Inspections', icon: 'clipboard-check', route: '/inspections', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'] },
        { label: 'Signalements', icon: 'alert', route: '/demandes-intervention', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'] },
      ],
    },
    {
      titre: 'Atelier',
      items: [
        { label: 'Ordres de travail', icon: 'wrench', route: '/ordres-travail', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'] },
        { label: 'Maintenance préventive', icon: 'calendar', route: '/maintenance', roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'] },
        { label: 'Stocks & pièces', icon: 'archive', route: '/stocks', roles: ['ADMIN', 'DIRECTION'] },
      ],
    },
    {
      titre: 'Organisation',
      items: [
        { label: 'Utilisateurs', icon: 'users', route: '/administration', roles: ['ADMIN', 'DIRECTION', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'] },
        { label: 'Application mobile', icon: 'smartphone', route: '/application-mobile' },
      ],
    },
  ];

  readonly groupesVisibles = computed(() => {
    const r = this.role();
    return this.groupes
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (r && i.roles.includes(r))) }))
      .filter((g) => g.items.length > 0);
  });

  readonly roleLabel = computed(() => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      RESPONSABLE_PARC: 'Resp. parc',
      RESPONSABLE_MAINTENANCE: 'Resp. maintenance',
      MECANICIEN: 'Mécanicien',
      CHAUFFEUR: 'Chauffeur',
      DIRECTION: 'Logistique',
    };
    return labels[this.role() ?? ''] ?? this.role() ?? '';
  });

  readonly initiales = computed(() => {
    const u = this.user();
    return `${u?.prenom?.[0] ?? ''}${u?.nom?.[0] ?? ''}`.toUpperCase();
  });

  constructor() {
    // Ferme le menu mobile à chaque navigation
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.layout.close());
    effect(() => {
      try {
        localStorage.setItem(CLE_REPLI, this.collapsed() ? '1' : '0');
      } catch {
        /* stockage indisponible : le choix ne sera simplement pas mémorisé */
      }
    });
  }

  /** Sur mobile, le menu s'affiche toujours en entier */
  readonly reduit = computed(() => this.collapsed() && !this.layout.mobileOpen());

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }
  logout() {
    this.auth.logout();
  }
}
