import { Component, ChangeDetectionStrategy, inject, OnInit, signal, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';

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
  protected readonly gameStateService: GameStateService = inject(GameStateService);

  protected readonly String: StringConstructor = String;

  public gameCode: string = '';
  public readonly selectedAnswer = signal<number | null>(null);
  private lastQuestionIndex: number = -1;

  constructor() {
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

  public ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const currentGameCode: string | null = this.gameStateService.gameCode();
    const state = this.gameStateService.state();

    if (!currentGameCode || currentGameCode !== this.gameCode || state !== 'in-progress') {
      this.router.navigate(['/']);
      return;
    }

    this.lastQuestionIndex = this.gameStateService.questionIndex();
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

  public getExplanation(): string {
    const result = this.gameStateService.answerResult();
    return result?.explanation ?? '';
  }

  public showExplanation(): boolean {
    return this.gameStateService.answerResult() !== null;
  }
}
