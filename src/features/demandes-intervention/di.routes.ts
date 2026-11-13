import { Routes } from '@angular/router';

export const DI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/di-list.component').then(m => m.DiListComponent),
  },
];
