import { Routes } from '@angular/router';

export const STOCKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/stocks-list.component').then(m => m.StocksListComponent),
  },
  {
    path: 'nouvelle-piece',
    loadComponent: () => import('./form/piece-form.component').then(m => m.PieceFormComponent),
  },
];
