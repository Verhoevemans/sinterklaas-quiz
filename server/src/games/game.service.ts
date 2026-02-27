import { GameSession, IGameSession, IPlayer, IPlayerAnswer } from './game.model.js';
import { Question, IQuestion } from '../questions/question.model.js';
import { logger } from '../shared/logger.js';

export class GameService {
  public generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

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

  public async findGameByCode(code: string): Promise<IGameSession | null> {
    return GameSession.findOne({ code });
  }

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
