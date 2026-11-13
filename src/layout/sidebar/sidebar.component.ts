import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  private auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  private router = inject(Router);

  readonly user = this.auth.user;
  readonly role = this.auth.role;

  collapsed = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'grid', route: '/tableau-de-bord' },
    {
      label: 'Véhicules',
      icon: 'truck',
      route: '/vehicules',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'CHAUFFEUR', 'DIRECTION'],
    },
    {
      label: 'Inspections',
      icon: 'clipboard-check',
      route: '/inspections',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'],
    },
    {
      label: 'Signalements',
      icon: 'alert',
      route: '/demandes-intervention',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN', 'CHAUFFEUR'],
    },
    {
      label: 'Ordres de Travail',
      icon: 'wrench',
      route: '/ordres-travail',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'],
    },
    {
      label: 'Maintenance',
      icon: 'calendar',
      route: '/maintenance',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'],
    },
    { label: 'Stocks & Pièces', icon: 'archive', route: '/stocks', roles: ['ADMIN', 'DIRECTION'] },
    {
      label: 'Analyse AMDEC',
      icon: 'chart-bar',
      route: '/amdec',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE'],
    },
    {
      label: 'Rapports',
      icon: 'download',
      route: '/rapports',
      roles: ['ADMIN', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'DIRECTION'],
    },
    {
      label: 'Administration',
      icon: 'users',
      route: '/administration',
      roles: ['ADMIN', 'DIRECTION', 'RESPONSABLE_PARC', 'RESPONSABLE_MAINTENANCE', 'MECANICIEN'],
    },
  ];

  readonly visibleItems = computed(() => {
    const r = this.role();
    return this.navItems.filter((item) => !item.roles || (r && item.roles.includes(r)));
  });

  readonly roleLabel = computed(() => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      RESPONSABLE_PARC: 'Resp. Parc',
      RESPONSABLE_MAINTENANCE: 'Resp. Maintenance',
      MECANICIEN: 'Mécanicien',
      CHAUFFEUR: 'Chauffeur',
      DIRECTION: 'Logistique',
    };
    return labels[this.role() ?? ''] ?? this.role() ?? '';
  });

  constructor() {
    // Ferme la sidebar mobile à chaque navigation
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.layout.close();
    });
  }

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }
  logout() {
    this.auth.logout();
  }
}
