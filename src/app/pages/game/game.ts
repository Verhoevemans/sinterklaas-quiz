import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected gameStateService = inject(GameStateService);

  protected readonly String = String;

  gameCode = '';
  selectedAnswer = signal<number | null>(null);
  showExplanation = signal(false);

  ngOnInit(): void {
    this.gameCode = this.route.snapshot.paramMap.get('code') ?? '';
    const session = this.gameStateService.gameSession();

    if (!session || session.code !== this.gameCode || session.state !== 'in-progress') {
      this.router.navigate(['/']);
    }
  }

  selectAnswer(index: number): void {
    if (this.gameStateService.hasPlayerAnsweredCurrentQuestion()) {
      return;
    }

    this.selectedAnswer.set(index);
  }

  submitAnswer(): void {
    const selected = this.selectedAnswer();
    const question = this.gameStateService.currentQuestion();

    if (selected === null || !question) {
      return;
    }

    this.gameStateService.submitAnswer(question.id, selected);
    this.showExplanation.set(true);
  }

  nextQuestion(): void {
    const session = this.gameStateService.gameSession();
    if (!session) return;

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= session.questions.length) {
      this.gameStateService.endGame();
      this.router.navigate(['/results', this.gameCode]);
    } else {
      this.gameStateService.nextQuestion();
      this.selectedAnswer.set(null);
      this.showExplanation.set(false);
    }
  }

  hasAnswered(): boolean {
    return this.gameStateService.hasPlayerAnsweredCurrentQuestion();
  }

  canSubmit(): boolean {
    return this.selectedAnswer() !== null && !this.hasAnswered();
  }

  isCorrectAnswer(index: number): boolean {
    const question = this.gameStateService.currentQuestion();
    return question?.correctAnswerIndex === index;
  }

  getAnswerClass(index: number): string {
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
