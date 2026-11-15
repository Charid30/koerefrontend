import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('../features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('../layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },

      // Accessible à tous les rôles connectés
      {
        path: 'tableau-de-bord',
        loadChildren: () => import('../features/tableau-de-bord/tableau-de-bord.routes').then(m => m.TABLEAU_ROUTES),
      },
      {
        path: 'notifications',
        loadChildren: () => import('../features/notifications/notifications.routes').then(m => m.NOTIFICATIONS_ROUTES),
      },

      // Véhicules — tous sauf MECANICIEN
      {
        path: 'vehicules',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','CHAUFFEUR','DIRECTION')],
        loadChildren: () => import('../features/vehicules/vehicules.routes').then(m => m.VEHICULES_ROUTES),
      },

      // Inspections — tous sauf DIRECTION
      {
        path: 'inspections',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN','CHAUFFEUR')],
        loadChildren: () => import('../features/inspections/inspections.routes').then(m => m.INSPECTIONS_ROUTES),
      },

      // Demandes d'Intervention — tous sauf DIRECTION
      {
        path: 'demandes-intervention',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN','CHAUFFEUR')],
        loadChildren: () => import('../features/demandes-intervention/di.routes').then(m => m.DI_ROUTES),
      },

      // Ordres de Travail — encadrement, et mécaniciens pour remplir leur compte rendu
      {
        path: 'ordres-travail',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN')],
        loadChildren: () => import('../features/ordres-travail/ordres-travail.routes').then(m => m.OT_ROUTES),
      },

      // Maintenance préventive — encadrement seulement
      {
        path: 'maintenance',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE')],
        loadChildren: () => import('../features/maintenance/maintenance.routes').then(m => m.MAINTENANCE_ROUTES),
      },

      // Stocks — ADMIN + Logistique uniquement
      {
        path: 'stocks',
        canActivate: [roleGuard('ADMIN','DIRECTION')],
        loadChildren: () => import('../features/stocks/stocks.routes').then(m => m.STOCKS_ROUTES),
      },

      // AMDEC — encadrement seulement
      {
        path: 'amdec',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE')],
        loadChildren: () => import('../features/amdec/amdec.routes').then(m => m.AMDEC_ROUTES),
      },

      // Rapports — encadrement + direction
      {
        path: 'rapports',
        canActivate: [roleGuard('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','DIRECTION')],
        loadChildren: () => import('../features/rapports/rapports.routes').then(m => m.RAPPORTS_ROUTES),
      },

      // Administration — hiérarchique (chaque rôle gère ses subordonnés)
      {
        path: 'administration',
        canActivate: [roleGuard('ADMIN','DIRECTION','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN')],
        loadChildren: () => import('../features/administration/administration.routes').then(m => m.ADMINISTRATION_ROUTES),
      },

      // Application mobile — tous les utilisateurs connectés
      {
        path: 'application-mobile',
        loadComponent: () => import('../features/application-mobile/application-mobile.component').then(m => m.ApplicationMobileComponent),
      },

      // Profil — tous les utilisateurs connectés
      {
        path: 'profil',
        loadComponent: () => import('../features/profil/profil.component').then(m => m.ProfilComponent),
      },

    ],
  },
  { path: '**', redirectTo: '' },
];
