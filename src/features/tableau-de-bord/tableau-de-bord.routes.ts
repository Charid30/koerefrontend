import { Routes } from '@angular/router';
export const TABLEAU_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./tableau-de-bord.component').then(m => m.TableauDeBordComponent) },
];
