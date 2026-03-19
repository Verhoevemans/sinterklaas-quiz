import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

export const adminAuthGuard: CanActivateFn = () => {
  const authService: AdminAuthService = inject(AdminAuthService);
  const router: Router = inject(Router);
  if (authService.isAuthenticated()) return true;
  return router.createUrlTree(['/admin/login']);
};

export const adminLoginGuard: CanActivateFn = () => {
  const authService: AdminAuthService = inject(AdminAuthService);
  const router: Router = inject(Router);
  if (!authService.isAuthenticated()) return true;
  return router.createUrlTree(['/admin/questions']);
};
