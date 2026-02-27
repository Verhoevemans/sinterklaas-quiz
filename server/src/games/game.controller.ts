import { Request, Response } from 'express';

import { logger } from '../shared/logger.js';
import { GameSession, IGameSession, IPlayer } from './game.model.js';
import { Question, IQuestion } from '../questions/question.model.js';
import { GameService } from './game.service.js';

export class GameController {
  private readonly service: GameService;

  constructor() {
    this.service = new GameService();
    this.createGame = this.createGame.bind(this);
    this.getGameByCode = this.getGameByCode.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.getQuestionByIndex = this.getQuestionByIndex.bind(this);
  }

  /**
   * POST /api/games - Create a new game
   */
  public async createGame(req: Request, res: Response): Promise<void> {
    logger.api('POST', '/api/games', {
      hostNickname: req.body.hostNickname,
      questionCount: req.body.questionCount,
    });

    try {
      const { hostNickname, questionCount = 15 } = req.body;

      if (!hostNickname || hostNickname.length < 3 || hostNickname.length > 20) {
        res.status(400).json({ error: 'Nickname must be between 3 and 20 characters' });
        return;
      }

      if (questionCount < 10 || questionCount > 20) {
        res.status(400).json({ error: 'Question count must be between 10 and 20' });
        return;
      }

      const questions: IQuestion[] = await Question.aggregate([
        { $match: { isActive: true, isDeleted: false } },
        { $sample: { size: questionCount } },
      ]);

      if (questions.length < questionCount) {
        res.status(400).json({
          error: `Not enough questions available. Found ${questions.length}, need ${questionCount}`,
        });
        return;
      }

      const code: string = await this.service.generateUniqueGameCode();
      const hostId: string = this.service.generatePlayerId();

      const host: IPlayer = {
        id: hostId,
        nickname: hostNickname,
        score: 0,
        answers: [],
        isHost: true,
      };

      const gameSession: IGameSession = new GameSession({
        code,
        hostId,
        players: [host],
        questionIds: questions.map((q) => q._id),
        questionCount,
        currentQuestionIndex: 0,
        state: 'lobby',
      });

      await gameSession.save();

      logger.info('Game created', { code, hostId, questionCount });

      res.status(201).json({
        code,
        playerId: hostId,
        game: gameSession,
      });
    } catch (error) {
      logger.error('POST /api/games', error);
      res.status(500).json({ error: 'Failed to create game' });
    }
  }

  /**
   * GET /api/games/:code - Get game by code
   */
  public async getGameByCode(req: Request, res: Response): Promise<void> {
    const code: string = req.params.code;
    logger.api('GET', `/api/games/${code}`);

    try {
      const gameData = await this.service.getGameWithQuestions(code);

      if (!gameData) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      res.json(gameData);
    } catch (error) {
      logger.error(`GET /api/games/${code}`, error);
      res.status(500).json({ error: 'Failed to fetch game' });
    }
  }

  /**
   * POST /api/games/:code/join - Join a game
   */
  public async joinGame(req: Request, res: Response): Promise<void> {
    const code: string = req.params.code;
    logger.api('POST', `/api/games/${code}/join`, { nickname: req.body.nickname });

    try {
      const { nickname } = req.body;

      if (!nickname || nickname.length < 3 || nickname.length > 20) {
        res.status(400).json({ error: 'Nickname must be between 3 and 20 characters' });
        return;
      }

      const game: IGameSession | null = await GameSession.findOne({ code });

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      if (game.state !== 'lobby') {
        res.status(400).json({ error: 'Game has already started' });
        return;
      }

      const nicknameTaken: boolean = game.players.some(
        (p: IPlayer) => p.nickname.toLowerCase() === nickname.toLowerCase()
      );

      if (nicknameTaken) {
        res.status(400).json({ error: 'Nickname is already taken' });
        return;
      }

      const playerId: string = this.service.generatePlayerId();
      const newPlayer: IPlayer = {
        id: playerId,
        nickname,
        score: 0,
        answers: [],
        isHost: false,
      };

      game.players.push(newPlayer);
      await game.save();

      logger.info('Player joined game', { code, playerId, nickname });

      res.status(201).json({
        playerId,
        game,
      });
    } catch (error) {
      logger.error(`POST /api/games/${code}/join`, error);
      res.status(500).json({ error: 'Failed to join game' });
    }
  }

  /**
   * GET /api/games/:code/questions/:index - Get question by index
   */
  public async getQuestionByIndex(req: Request, res: Response): Promise<void> {
    const code: string = req.params.code;
    const index: number = parseInt(req.params.index);
    logger.api('GET', `/api/games/${code}/questions/${index}`);

    try {
      const game: IGameSession | null = await GameSession.findOne({ code });

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      if (game.state !== 'in-progress') {
        res.status(400).json({ error: 'Game is not in progress' });
        return;
      }

      if (index < 0 || index >= game.questionIds.length) {
        res.status(400).json({ error: 'Invalid question index' });
        return;
      }

      const question: IQuestion | null = await Question.findById(game.questionIds[index]);

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      res.json({
        id: question._id,
        text: question.text,
        options: question.options,
        questionType: question.questionType,
        imageUrl: question.imageUrl,
      });
    } catch (error) {
      logger.error(`GET /api/games/${code}/questions/${index}`, error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  }
}
