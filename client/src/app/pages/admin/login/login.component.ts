import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminAuthService } from '../admin-auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService: AdminAuthService = inject(AdminAuthService);
  private readonly router: Router = inject(Router);

  public readonly form: FormGroup = new FormGroup({
    password: new FormControl('', [Validators.required]),
  });

  public readonly error = signal<string | null>(null);
  public readonly loading = signal<boolean>(false);

  public async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;

    this.error.set(null);
    this.loading.set(true);

    const password: string = this.form.value.password as string;
    const success: boolean = await this.authService.login(password);

    this.loading.set(false);

    if (success) {
      this.router.navigate(['/admin/questions']);
    } else {
      this.error.set('Ongeldig wachtwoord. Probeer opnieuw.');
    }
  }
}
