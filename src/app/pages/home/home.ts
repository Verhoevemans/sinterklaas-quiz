import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  private router = inject(Router);
  private gameStateService = inject(GameStateService);

  showCreateForm = signal(false);
  showJoinForm = signal(false);

  createNickname = signal('');
  createQuestionCount = signal(15);

  joinCode = signal('');
  joinNickname = signal('');

  errorMessage = signal('');

  showCreate(): void {
    this.showCreateForm.set(true);
    this.showJoinForm.set(false);
    this.errorMessage.set('');
  }

  showJoin(): void {
    this.showCreateForm.set(false);
    this.showJoinForm.set(true);
    this.errorMessage.set('');
  }

  createGame(): void {
    const nickname = this.createNickname().trim();

    if (nickname.length < 3 || nickname.length > 20) {
      this.errorMessage.set('Nickname moet tussen 3 en 20 karakters zijn');
      return;
    }

    const gameCode = this.gameStateService.createGame(nickname, this.createQuestionCount());
    this.router.navigate(['/lobby', gameCode]);
  }

  joinGame(): void {
    const code = this.joinCode().trim();
    const nickname = this.joinNickname().trim();

    if (code.length !== 6) {
      this.errorMessage.set('Spelcode moet 6 cijfers zijn');
      return;
    }

    if (nickname.length < 3 || nickname.length > 20) {
      this.errorMessage.set('Nickname moet tussen 3 en 20 karakters zijn');
      return;
    }

    const success = this.gameStateService.joinGame(code, nickname);

    if (!success) {
      this.errorMessage.set('Spel niet gevonden of nickname al in gebruik');
      return;
    }

    this.router.navigate(['/lobby', code]);
  }
}
