import { Component, ChangeDetectionStrategy, inject, OnInit, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-lobby',
  imports: [],
  templateUrl: './lobby.html',
  styleUrl: './lobby.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent implements OnInit {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  protected readonly gameStateService: GameStateService = inject(GameStateService);

  public gameCode: string = '';

  constructor() {
    // Navigate to game when game state changes to 'in-progress'
    effect(() => {
      const state = this.gameStateService.state();
      if (state === 'in-progress' && this.gameCode) {
        this.router.navigate(['/game', this.gameCode]);
      }
    });
  }

  public ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const currentGameCode: string | null = this.gameStateService.gameCode();

    if (!currentGameCode || currentGameCode !== this.gameCode) {
      this.router.navigate(['/']);
      return;
    }
  }

  public startGame(): void {
    const isHost: boolean = this.gameStateService.isHost();
    const players = this.gameStateService.players();

    if (!isHost || players.length < 2) {
      return;
    }

    this.gameStateService.startGame();
    // Navigation will happen automatically via socket event
  }

  public canStartGame(): boolean {
    return this.gameStateService.isHost() && this.gameStateService.players().length >= 2;
  }
}
