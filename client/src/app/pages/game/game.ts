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
import { HostViewComponent } from './host-view/host-view';
import { PlayerViewComponent } from './player-view/player-view';

@Component({
  selector: 'app-game',
  imports: [HostViewComponent, PlayerViewComponent],
  templateUrl: './game.html',
  styleUrl: './game.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  protected readonly gameStateService: GameStateService = inject(GameStateService);

  private gameCode: string = '';
  private readonly now = signal<number>(Date.now());
  private readonly clockInterval: ReturnType<typeof setInterval>;

  protected readonly countdown = computed<number>(() => {
    const startTime: number | null = this.gameStateService.questionStartTimeValue();
    if (!startTime) return 0;
    return Math.max(0, Math.ceil((20000 - (this.now() - startTime)) / 1000));
  });

  constructor() {
    this.clockInterval = setInterval(() => this.now.set(Date.now()), 250);

    effect(() => {
      const state = this.gameStateService.state();
      if (state === 'completed' && this.gameCode) {
        this.router.navigate(['/results', this.gameCode]);
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
  }
}
