import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  OnInit,
  effect,
} from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';

@Component({
  selector: 'app-player-view',
  imports: [],
  templateUrl: './player-view.html',
  styleUrl: './player-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerViewComponent implements OnInit {
  public readonly countdown = input.required<number>();

  protected readonly gameStateService: GameStateService = inject(GameStateService);
  protected readonly String: StringConstructor = String;

  public readonly selectedAnswer = signal<number | null>(null);
  private lastQuestionIndex: number = -1;

  constructor() {
    effect(() => {
      const qi: number = this.gameStateService.questionIndex();
      if (qi !== this.lastQuestionIndex) {
        this.lastQuestionIndex = qi;
        this.selectedAnswer.set(null);
      }
    });
  }

  public ngOnInit(): void {
    this.lastQuestionIndex = this.gameStateService.questionIndex();
    if (this.gameStateService.hasPlayerAnsweredCurrentQuestion()) {
      const i: number | null = this.gameStateService.getSelectedIndexForCurrentQuestion();
      if (i !== null) {
        this.selectedAnswer.set(i);
      }
    }
  }

  public selectAnswer(index: number): void {
    if (this.hasAnswered()) return;
    this.selectedAnswer.set(index);
  }

  public submitAnswer(): void {
    const selected: number | null = this.selectedAnswer();
    const question = this.gameStateService.question();
    if (selected === null || !question) return;
    this.gameStateService.submitAnswer(question.id, selected);
  }

  public hasAnswered(): boolean {
    return this.gameStateService.hasPlayerAnsweredCurrentQuestion();
  }

  public showExplanation(): boolean {
    return this.gameStateService.answerResult() !== null;
  }

  public getAnswerClass(index: number): string {
    const result = this.gameStateService.answerResult();
    if (!result) {
      return this.selectedAnswer() === index ? 'selected' : '';
    }
    if (result.correctAnswerIndex === index) return 'correct';
    if (this.selectedAnswer() === index) return 'incorrect';
    return '';
  }

  public getResultTitle(): string {
    if (!this.hasAnswered()) return 'Helaas, je was te laat met je antwoord verzenden';
    const result = this.gameStateService.answerResult();
    if (result && this.selectedAnswer() === result.correctAnswerIndex) {
      return 'Je antwoord was goed!';
    }
    return 'Helaas, je antwoord was niet goed';
  }

  public getResultClass(): 'correct' | 'incorrect' | 'late' {
    if (!this.hasAnswered()) return 'late';
    const result = this.gameStateService.answerResult();
    if (result && this.selectedAnswer() === result.correctAnswerIndex) return 'correct';
    return 'incorrect';
  }
}
