import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin',
  imports: [RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly authService: AdminAuthService = inject(AdminAuthService);
  private readonly router: Router = inject(Router);

  protected readonly isAuthenticated: Signal<boolean> = this.authService.isAuthenticated;

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
