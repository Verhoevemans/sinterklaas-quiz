import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  DestroyRef,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { GameSession } from '../../models';

@Component({
  selector: 'app-game',
  imports: [],
  templateUrl: './game.html',
  styleUrl: './game.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  protected readonly gameStateService: GameStateService = inject(GameStateService);

  protected readonly String: StringConstructor = String;

  public gameCode: string = '';
  public readonly selectedAnswer = signal<number | null>(null);
  public readonly showExplanation = signal<boolean>(false);
  private lastQuestionIndex: number = -1;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Watch for game state changes (completed, question changes)
    effect(() => {
      const session: GameSession | null = this.gameStateService.gameSession();
      if (!session || !this.gameCode) return;

      if (session.state === 'completed') {
        this.router.navigate(['/results', this.gameCode]);
      }

      // Reset answer selection when question changes (for non-host players)
      if (session.currentQuestionIndex !== this.lastQuestionIndex) {
        this.lastQuestionIndex = session.currentQuestionIndex;
        this.selectedAnswer.set(null);
        this.showExplanation.set(false);
      }
    });
  }

  public ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const session: GameSession | null = this.gameStateService.gameSession();

    if (!session || session.code !== this.gameCode || session.state !== 'in-progress') {
      this.router.navigate(['/']);
      return;
    }

    this.lastQuestionIndex = session.currentQuestionIndex;

    // Poll for updates to sync with other players
    this.pollInterval = setInterval(() => {
      this.gameStateService.refreshFromStorage();
    }, 1000);

    this.destroyRef.onDestroy(() => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
    });
  }

  public selectAnswer(index: number): void {
    if (this.gameStateService.hasPlayerAnsweredCurrentQuestion()) {
      return;
    }

    this.selectedAnswer.set(index);
  }

  public submitAnswer(): void {
    const selected: number | null = this.selectedAnswer();
    const question = this.gameStateService.currentQuestion();

    if (selected === null || !question) {
      return;
    }

    this.gameStateService.submitAnswer(question.id, selected);
    this.showExplanation.set(true);
  }

  public nextQuestion(): void {
    const session: GameSession | null = this.gameStateService.gameSession();
    if (!session) return;

    const nextIndex: number = session.currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      this.gameStateService.endGame();
      this.router.navigate(['/results', this.gameCode]);
    } else {
      this.gameStateService.nextQuestion();
      this.selectedAnswer.set(null);
      this.showExplanation.set(false);
    }
  }

  public hasAnswered(): boolean {
    return this.gameStateService.hasPlayerAnsweredCurrentQuestion();
  }

  public canSubmit(): boolean {
    return this.selectedAnswer() !== null && !this.hasAnswered();
  }

  public isCorrectAnswer(index: number): boolean {
    const question = this.gameStateService.currentQuestion();
    return question?.correctAnswerIndex === index;
  }

  public getAnswerClass(index: number): string {
    if (!this.showExplanation()) {
      return this.selectedAnswer() === index ? 'selected' : '';
    }

    if (this.isCorrectAnswer(index)) {
      return 'correct';
    }

    if (this.selectedAnswer() === index) {
      return 'incorrect';
    }

    return '';
  }
}
