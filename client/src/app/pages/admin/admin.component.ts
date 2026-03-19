import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

@Component({
  selector: 'app-admin',
  imports: [RouterOutlet],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
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
