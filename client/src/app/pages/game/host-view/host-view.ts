import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';

@Component({
  selector: 'app-host-view',
  imports: [],
  templateUrl: './host-view.html',
  styleUrl: './host-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostViewComponent {
  public readonly countdown = input.required<number>();

  protected readonly gameStateService: GameStateService = inject(GameStateService);
  protected readonly String: StringConstructor = String;

  public getAnswerClass(index: number): string {
    const result = this.gameStateService.answerResult();
    if (!result) return '';
    return result.correctAnswerIndex === index ? 'correct' : '';
  }

  public showExplanation(): boolean {
    return this.gameStateService.answerResult() !== null;
  }

  public advance(): void {
    const atEnd =
      this.gameStateService.questionIndex() + 1 >= this.gameStateService.questionCount();
    atEnd ? this.gameStateService.endGame() : this.gameStateService.nextQuestion();
  }
}
