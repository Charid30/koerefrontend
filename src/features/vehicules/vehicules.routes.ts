import { Routes } from '@angular/router';

export const VEHICULES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/vehicules-list.component').then(m => m.VehiculesListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./form/vehicule-form.component').then(m => m.VehiculeFormComponent),
  },
  {
    path: ':id/modifier',
    loadComponent: () => import('./form/vehicule-form.component').then(m => m.VehiculeFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./detail/vehicule-detail.component').then(m => m.VehiculeDetailComponent),
  },
];
