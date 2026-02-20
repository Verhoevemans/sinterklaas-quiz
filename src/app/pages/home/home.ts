import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  private readonly router: Router = inject(Router);
  private readonly gameStateService: GameStateService = inject(GameStateService);

  public readonly showCreateForm = signal<boolean>(false);
  public readonly showJoinForm = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly isLoading = signal<boolean>(false);

  public readonly createGameForm: FormGroup = new FormGroup({
    nickname: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
    ]),
    questionCount: new FormControl<number>(15, [Validators.required]),
  });

  public readonly joinGameForm: FormGroup = new FormGroup({
    code: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
    ]),
    nickname: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
    ]),
  });

  public showCreate(): void {
    this.showCreateForm.set(true);
    this.showJoinForm.set(false);
    this.errorMessage.set('');
    this.createGameForm.reset({ nickname: '', questionCount: 15 });
  }

  public showJoin(): void {
    this.showCreateForm.set(false);
    this.showJoinForm.set(true);
    this.errorMessage.set('');
    this.joinGameForm.reset({ code: '', nickname: '' });
  }

  public hideForm(): void {
    this.showCreateForm.set(false);
    this.showJoinForm.set(false);
    this.errorMessage.set('');
  }

  public async createGame(): Promise<void> {
    if (this.createGameForm.invalid) {
      this.errorMessage.set('Nickname moet tussen 3 en 20 karakters zijn');
      return;
    }

    const nickname: string = this.createGameForm.get('nickname')?.value?.trim() ?? '';
    const questionCount: number = this.createGameForm.get('questionCount')?.value ?? 15;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const gameCode: string = await this.gameStateService.createGame(nickname, questionCount);
      this.router.navigate(['/lobby', gameCode]);
    } catch (error) {
      this.errorMessage.set('Kon spel niet aanmaken. Probeer het opnieuw.');
      console.error('Failed to create game:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async joinGame(): Promise<void> {
    if (this.joinGameForm.invalid) {
      this.errorMessage.set('Vul alle velden correct in');
      return;
    }

    const code: string = this.joinGameForm.get('code')?.value?.trim() ?? '';
    const nickname: string = this.joinGameForm.get('nickname')?.value?.trim() ?? '';

    if (code.length !== 6) {
      this.errorMessage.set('Spelcode moet 6 cijfers zijn');
      return;
    }

    if (nickname.length < 3 || nickname.length > 20) {
      this.errorMessage.set('Nickname moet tussen 3 en 20 karakters zijn');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success: boolean = await this.gameStateService.joinGame(code, nickname);

      if (!success) {
        this.errorMessage.set('Spel niet gevonden of nickname al in gebruik');
        return;
      }

      this.router.navigate(['/lobby', code]);
    } catch (error) {
      this.errorMessage.set('Kon niet deelnemen aan spel. Probeer het opnieuw.');
      console.error('Failed to join game:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
