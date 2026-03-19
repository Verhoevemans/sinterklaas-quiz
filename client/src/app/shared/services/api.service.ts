import { Injectable } from '@angular/core';
import { GameSession, Player, Question } from '../models';

const API_BASE_URL: string = 'http://localhost:3000/api';

export interface CreateGameResponse {
  code: string;
  playerId: string;
  game: GameSession;
}

export interface JoinGameResponse {
  playerId: string;
  game: GameSession;
}

export interface GetGameResponse {
  game: GameSession;
  currentQuestion: Question | null;
  questions: Question[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  public async createGame(hostNickname: string, questionCount: number): Promise<CreateGameResponse> {
    const response: Response = await fetch(`${API_BASE_URL}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostNickname, questionCount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create game');
    }

    return response.json();
  }

  public async getGame(code: string): Promise<GetGameResponse> {
    const response: Response = await fetch(`${API_BASE_URL}/games/${code}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get game');
    }

    return response.json();
  }

  public async joinGame(code: string, nickname: string): Promise<JoinGameResponse> {
    const response: Response = await fetch(`${API_BASE_URL}/games/${code}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nickname }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join game');
    }

    return response.json();
  }

  public async getQuestion(code: string, index: number): Promise<Question> {
    const response: Response = await fetch(`${API_BASE_URL}/games/${code}/questions/${index}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get question');
    }

    return response.json();
  }
}
