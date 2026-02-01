import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
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
  protected gameStateService = inject(GameStateService);

  gameCode = '';

  ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const session = this.gameStateService.gameSession();

    if (!session || session.code !== this.gameCode) {
      this.router.navigate(['/']);
    }
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
