import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'lobby/:code',
    loadComponent: () => import('./pages/lobby/lobby').then((m) => m.LobbyComponent),
  },
  {
    path: 'game/:code',
    loadComponent: () => import('./pages/game/game').then((m) => m.GameComponent),
  },
  {
    path: 'results/:code',
    loadComponent: () => import('./pages/results/results').then((m) => m.ResultsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
