import { Component, ChangeDetectionStrategy, inject, OnInit, computed, Signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { Player } from '../../models';

interface PlayerStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

@Component({
  selector: 'app-results',
  imports: [],
  templateUrl: './results.html',
  styleUrl: './results.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent implements OnInit {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  protected readonly gameStateService: GameStateService = inject(GameStateService);

  public gameCode: string = '';

  public readonly winner: Signal<Player | null> = computed(() => {
    const players: Player[] = this.gameStateService.sortedPlayers();
    return players.length > 0 ? players[0] : null;
  });

  public readonly currentPlayerStats: Signal<PlayerStats | null> = computed(() => {
    const player: Player | null = this.gameStateService.currentPlayer();
    if (!player) return null;

    const totalQuestions: number = player.answers.length;
    const correctAnswers: number = player.answers.filter((a) => a.isCorrect).length;
    const accuracy: number = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    return {
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy),
    };
  });

  public ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const currentGameCode: string | null = this.gameStateService.gameCode();
    const state = this.gameStateService.state();

    if (!currentGameCode || currentGameCode !== this.gameCode || state !== 'completed') {
      this.router.navigate(['/']);
    }
  }

  public playAgain(): void {
    this.gameStateService.resetGame();
    this.router.navigate(['/']);
  }

  public getRankSuffix(index: number): string {
    if (index === 0) return 'ste';
    if (index === 1) return 'de';
    if (index === 2) return 'de';
    return 'de';
  }
}
