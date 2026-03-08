import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-game',
  imports: [],
  templateUrl: './game.html',
  styleUrl: './game.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  protected readonly gameStateService: GameStateService = inject(GameStateService);

  protected readonly String: StringConstructor = String;

  public gameCode: string = '';
  public readonly selectedAnswer = signal<number | null>(null);
  private lastQuestionIndex: number = -1;

  private readonly now = signal<number>(Date.now());
  private readonly clockInterval: ReturnType<typeof setInterval>;

  protected readonly countdown = computed<number>(() => {
    const startTime: number | null = this.gameStateService.questionStartTimeValue();
    if (!startTime) return 0;
    return Math.max(0, Math.ceil((20000 - (this.now() - startTime)) / 1000));
  });

  constructor() {
    this.clockInterval = setInterval(() => this.now.set(Date.now()), 250);

    // Watch for game state changes
    effect(() => {
      const state = this.gameStateService.state();
      if (state === 'completed' && this.gameCode) {
        this.router.navigate(['/results', this.gameCode]);
      }
    });

    // Reset answer selection when question changes
    effect(() => {
      const questionIndex: number = this.gameStateService.questionIndex();
      if (questionIndex !== this.lastQuestionIndex) {
        this.lastQuestionIndex = questionIndex;
        this.selectedAnswer.set(null);
      }
    });
  }

  public ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }

  public async ngOnInit(): Promise<void> {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const currentGameCode: string | null = this.gameStateService.gameCode();

    if (!currentGameCode || currentGameCode !== this.gameCode) {
      this.router.navigate(['/']);
      return;
    }

    // Socket not connected means the page was refreshed — reconnect before checking state
    if (!this.gameStateService.socketConnected()) {
      const reconnected: boolean = await this.gameStateService.reconnectToGame();
      if (!reconnected) {
        this.router.navigate(['/']);
        return;
      }
    }

    const state = this.gameStateService.state();

    if (state === 'completed') {
      this.router.navigate(['/results', this.gameCode]);
      return;
    }

    if (state !== 'in-progress') {
      this.router.navigate(['/lobby', this.gameCode]);
      return;
    }

    this.lastQuestionIndex = this.gameStateService.questionIndex();

    // Restore selected answer if the player already answered before refreshing
    if (this.gameStateService.hasPlayerAnsweredCurrentQuestion()) {
      const selectedIndex: number | null =
        this.gameStateService.getSelectedIndexForCurrentQuestion();
      if (selectedIndex !== null) {
        this.selectedAnswer.set(selectedIndex);
      }
    }
  }

  public selectAnswer(index: number): void {
    if (this.hasAnswered()) {
      return;
    }

    this.selectedAnswer.set(index);
  }

  public submitAnswer(): void {
    const selected: number | null = this.selectedAnswer();
    const question = this.gameStateService.question();

    if (selected === null || !question) {
      return;
    }

    this.gameStateService.submitAnswer(question.id, selected);
  }

  public nextQuestion(): void {
    const questionIndex: number = this.gameStateService.questionIndex();
    const questionCount: number = this.gameStateService.questionCount();

    if (questionIndex + 1 >= questionCount) {
      this.gameStateService.endGame();
    } else {
      this.gameStateService.nextQuestion();
    }
    // Navigation/state updates happen via socket events
  }

  public hasAnswered(): boolean {
    return this.gameStateService.hasPlayerAnsweredCurrentQuestion();
  }

  public canSubmit(): boolean {
    return this.selectedAnswer() !== null && !this.hasAnswered();
  }

  public isCorrectAnswer(index: number): boolean {
    const result = this.gameStateService.answerResult();
    if (!result) return false;
    return result.correctAnswerIndex === index;
  }

  public getAnswerClass(index: number): string {
    const result = this.gameStateService.answerResult();

    if (!result) {
      // Before reveal: show selection highlight (locked if submitted, interactive otherwise)
      return this.selectedAnswer() === index ? 'selected' : '';
    }

    // After reveal: show correct/incorrect
    if (this.isCorrectAnswer(index)) {
      return 'correct';
    }

    if (this.selectedAnswer() === index) {
      return 'incorrect';
    }

    return '';
  }

  public getExplanation(): string {
    const result = this.gameStateService.answerResult();
    return result?.explanation ?? '';
  }

  public showExplanation(): boolean {
    return this.gameStateService.answerResult() !== null;
  }
}
