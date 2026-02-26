import { Request, Response } from 'express';
import { Types } from 'mongoose';

import { logger } from '../shared/logger.js';
import { GameSession, IGameSession, IPlayer, IPlayerAnswer } from './game.model.js';
import { Question, IQuestion } from '../questions/question.model.js';

export class GameController {
  constructor() {
    // Bind all route handler methods to preserve 'this' context
    this.createGame = this.createGame.bind(this);
    this.getGameByCode = this.getGameByCode.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.getQuestionByIndex = this.getQuestionByIndex.bind(this);
  }

  // ============================================
  // Route Handlers (receive req/res)
  // ============================================

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

      // Get random questions
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

      const code: string = await this.generateUniqueGameCode();
      const hostId: string = this.generatePlayerId();

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
      const game: IGameSession | null = await GameSession.findOne({ code });

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      // If game is in progress, include current question data
      let currentQuestion: IQuestion | null = null;
      if (game.state === 'in-progress' && game.questionIds[game.currentQuestionIndex]) {
        currentQuestion = await Question.findById(game.questionIds[game.currentQuestionIndex]);
      }

      // Get all questions if game is completed (for results)
      let questions: IQuestion[] = [];
      if (game.state === 'completed') {
        questions = await Question.find({ _id: { $in: game.questionIds } });
      }

      res.json({
        game,
        currentQuestion,
        questions,
      });
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

      // Check if nickname is taken
      const nicknameTaken: boolean = game.players.some(
        (p: IPlayer) => p.nickname.toLowerCase() === nickname.toLowerCase()
      );

      if (nicknameTaken) {
        res.status(400).json({ error: 'Nickname is already taken' });
        return;
      }

      const playerId: string = this.generatePlayerId();
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

      // Return question without correct answer during gameplay
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

  // ============================================
  // Shared Methods (used by routes and sockets)
  // ============================================

  /**
   * Generate a unique 6-digit game code
   */
  public async generateUniqueGameCode(): Promise<string> {
    let code: string;
    let exists: boolean = true;

    while (exists) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing: IGameSession | null = await GameSession.findOne({ code });
      exists = existing !== null;
    }

    return code!;
  }

  /**
   * Generate a unique player ID
   */
  public generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Find a game by code
   */
  public async findGameByCode(code: string): Promise<IGameSession | null> {
    return GameSession.findOne({ code });
  }

  /**
   * Get game with question data based on state (for socket handlers)
   */
  public async getGameWithQuestions(
    code: string
  ): Promise<{ game: IGameSession; currentQuestion: IQuestion | null; questions: IQuestion[] } | null> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game) {
      return null;
    }

    let currentQuestion: IQuestion | null = null;
    let questions: IQuestion[] = [];

    if (game.state === 'in-progress' && game.questionIds[game.currentQuestionIndex]) {
      currentQuestion = await Question.findById(game.questionIds[game.currentQuestionIndex]);
    }

    if (game.state === 'completed') {
      questions = await Question.find({ _id: { $in: game.questionIds } });
    }

    return { game, currentQuestion, questions };
  }

  /**
   * Update player's socket ID
   */
  public async updatePlayerSocketId(
    code: string,
    playerId: string,
    socketId: string
  ): Promise<IPlayer | null> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game) {
      return null;
    }

    const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

    if (!player) {
      return null;
    }

    player.socketId = socketId;
    await game.save();

    return player;
  }

  /**
   * Clear player's socket ID on disconnect
   */
  public async clearPlayerSocketId(
    socketId: string
  ): Promise<{ game: IGameSession; player: IPlayer } | null> {
    const game: IGameSession | null = await GameSession.findOne({
      'players.socketId': socketId,
    });

    if (!game) {
      return null;
    }

    const player: IPlayer | undefined = game.players.find((p) => p.socketId === socketId);

    if (!player) {
      return null;
    }

    player.socketId = undefined;
    await game.save();

    return { game, player };
  }

  /**
   * Start a game
   */
  public async startGame(
    code: string,
    playerId: string
  ): Promise<{ game: IGameSession; question: IQuestion }> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game) {
      throw new Error('Game not found');
    }

    const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

    if (!player || !player.isHost) {
      throw new Error('Only host can start the game');
    }

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    if (game.state !== 'lobby') {
      throw new Error('Game already started');
    }

    game.state = 'in-progress';
    game.currentQuestionIndex = 0;
    await game.save();

    const question: IQuestion | null = await Question.findById(game.questionIds[0]);

    if (!question) {
      throw new Error('Failed to load question');
    }

    logger.info('Game started', { code });

    return { game, question };
  }

  /**
   * Submit an answer
   */
  public async submitAnswer(
    code: string,
    playerId: string,
    questionId: string,
    selectedIndex: number
  ): Promise<{
    isCorrect: boolean;
    correctAnswerIndex: number;
    explanation: string;
    newScore: number;
  }> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game || game.state !== 'in-progress') {
      throw new Error('Game not in progress');
    }

    const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

    if (!player) {
      throw new Error('Player not found');
    }

    const alreadyAnswered: boolean = player.answers.some((a) => a.questionId === questionId);

    if (alreadyAnswered) {
      throw new Error('Already answered this question');
    }

    const question: IQuestion | null = await Question.findById(questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect: boolean = selectedIndex === question.correctAnswerIndex;
    const timestamp: number = Date.now();

    const answer: IPlayerAnswer = {
      questionId,
      selectedIndex,
      timestamp,
      isCorrect,
    };

    player.answers.push(answer);
    if (isCorrect) {
      player.score += 100;
    }

    await game.save();

    logger.info('Answer submitted', { code, playerId, isCorrect });

    return {
      isCorrect,
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
      newScore: player.score,
    };
  }

  /**
   * Advance to next question or end game
   */
  public async nextQuestion(
    code: string,
    playerId: string
  ): Promise<{
    ended: boolean;
    game: IGameSession;
    question?: IQuestion;
    questions?: IQuestion[];
  }> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game || game.state !== 'in-progress') {
      throw new Error('Game not in progress');
    }

    const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

    if (!player || !player.isHost) {
      throw new Error('Only host can advance questions');
    }

    const nextIndex: number = game.currentQuestionIndex + 1;

    if (nextIndex >= game.questionIds.length) {
      game.state = 'completed';
      await game.save();

      const questions: IQuestion[] = await Question.find({
        _id: { $in: game.questionIds },
      });

      logger.info('Game ended (all questions completed)', { code });

      return { ended: true, game, questions };
    }

    game.currentQuestionIndex = nextIndex;
    await game.save();

    const question: IQuestion | null = await Question.findById(game.questionIds[nextIndex]);

    if (!question) {
      throw new Error('Failed to load question');
    }

    logger.info('Advanced to next question', { code, questionIndex: nextIndex });

    return { ended: false, game, question };
  }

  /**
   * End game early
   */
  public async endGame(
    code: string,
    playerId: string
  ): Promise<{ game: IGameSession; questions: IQuestion[] }> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game) {
      throw new Error('Game not found');
    }

    const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

    if (!player || !player.isHost) {
      throw new Error('Only host can end the game');
    }

    game.state = 'completed';
    await game.save();

    const questions: IQuestion[] = await Question.find({
      _id: { $in: game.questionIds },
    });

    logger.info('Game ended early', { code });

    return { game, questions };
  }
}
