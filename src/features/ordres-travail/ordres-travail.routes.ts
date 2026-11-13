import { Routes } from '@angular/router';

export const OT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/ot-list.component').then(m => m.OtListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./form/ot-form.component').then(m => m.OtFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./detail/ot-detail.component').then(m => m.OtDetailComponent),
  },
];
