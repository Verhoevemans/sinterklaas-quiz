import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef, effect } from '@angular/core';
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  protected gameStateService = inject(GameStateService);

  gameCode = '';
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Navigate to game when game state changes to 'in-progress'
    effect(() => {
      const session = this.gameStateService.gameSession();
      if (session?.state === 'in-progress' && this.gameCode) {
        this.router.navigate(['/game', this.gameCode]);
      }
    });
  }

  ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const session = this.gameStateService.gameSession();

    if (!session || session.code !== this.gameCode) {
      this.router.navigate(['/']);
      return;
    }

    // Poll for updates every second to see new players and game state changes
    this.pollInterval = setInterval(() => {
      this.gameStateService.refreshFromStorage();
    }, 1000);

    this.destroyRef.onDestroy(() => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
    });
  }

  startGame(): void {
    const isHost = this.gameStateService.isHost();
    const players = this.gameStateService.players();

    if (!isHost || players.length < 2) {
      return;
    }

    this.gameStateService.startGame();
    this.router.navigate(['/game', this.gameCode]);
  }

  canStartGame(): boolean {
    return this.gameStateService.isHost() && this.gameStateService.players().length >= 2;
  }
}
