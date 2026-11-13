import { Routes } from '@angular/router';

export const ADMINISTRATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./users/users.component').then(m => m.UsersComponent),
  },
];
