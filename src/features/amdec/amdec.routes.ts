import { Routes } from '@angular/router';
export const AMDEC_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./amdec.component').then(m => m.AmdecComponent) },
];
