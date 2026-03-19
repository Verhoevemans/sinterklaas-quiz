import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'lobby/:code',
    loadComponent: () => import('./pages/lobby/lobby.component').then((m) => m.LobbyComponent),
  },
  {
    path: 'game/:code',
    loadComponent: () => import('./pages/game/game.component').then((m) => m.GameComponent),
  },
  {
    path: 'results/:code',
    loadComponent: () => import('./pages/results/results.component').then((m) => m.ResultsComponent),
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
