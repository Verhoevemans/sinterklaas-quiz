import { Injectable, signal, computed, Signal } from '@angular/core';

const API_BASE_URL: string = 'http://localhost:3000/api';
const STORAGE_KEY: string = 'admin-password';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly storedPassword = signal<string | null>(sessionStorage.getItem(STORAGE_KEY));

  public readonly isAuthenticated: Signal<boolean> = computed(() => this.storedPassword() !== null);

  public getAuthHeader(): string {
    return `Bearer ${this.storedPassword() ?? ''}`;
  }

  public async login(password: string): Promise<boolean> {
    try {
      const response: Response = await fetch(`${API_BASE_URL}/admin/questions?limit=1`, {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (response.ok) {
        this.storedPassword.set(password);
        sessionStorage.setItem(STORAGE_KEY, password);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public logout(): void {
    this.storedPassword.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
