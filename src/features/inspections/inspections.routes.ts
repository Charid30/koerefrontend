import { Routes } from '@angular/router';

export const INSPECTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/inspections-list.component').then(m => m.InspectionsListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./form/inspection-form.component').then(m => m.InspectionFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./detail/inspection-detail.component').then(m => m.InspectionDetailComponent),
  },
];
