import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { Player } from '../../models';

@Component({
  selector: 'app-results',
  imports: [],
  templateUrl: './results.html',
  styleUrl: './results.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected gameStateService = inject(GameStateService);

  gameCode = '';

  winner = computed(() => {
    const players = this.gameStateService.sortedPlayers();
    return players.length > 0 ? players[0] : null;
  });

  currentPlayerStats = computed(() => {
    const player = this.gameStateService.currentPlayer();
    if (!player) return null;

    const totalQuestions = player.answers.length;
    const correctAnswers = player.answers.filter((a) => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    return {
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy),
    };
  });

  ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const session = this.gameStateService.gameSession();

    if (!session || session.code !== this.gameCode || session.state !== 'completed') {
      this.router.navigate(['/']);
    }
  }

  playAgain(): void {
    this.gameStateService.resetGame();
    this.router.navigate(['/']);
  }

  getRankSuffix(index: number): string {
    if (index === 0) return 'ste';
    if (index === 1) return 'de';
    if (index === 2) return 'de';
    return 'de';
  }
}
