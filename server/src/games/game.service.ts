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
    game.questionStartTime = Date.now();
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
  ): Promise<{ received: true; allAnswered: boolean }> {
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
    const timeTaken: number = timestamp - (game.questionStartTime ?? timestamp);

    const answer: IPlayerAnswer = {
      questionId,
      selectedIndex,
      timestamp,
      isCorrect,
      timeTaken,
    };

    player.answers.push(answer);
    await game.save();

    // Check if all non-host players have answered this question
    const nonHostPlayers: IPlayer[] = game.players.filter((p) => !p.isHost);
    const allAnswered: boolean = nonHostPlayers.every((p) =>
      p.answers.some((a) => a.questionId === questionId)
    );

    logger.info('Answer submitted', { code, playerId, isCorrect });

    return { received: true, allAnswered };
  }

  public async revealAnswers(
    code: string
  ): Promise<{ correctAnswerIndex: number; explanation: string; scores: Array<{ id: string; nickname: string; score: number }> }> {
    const game: IGameSession | null = await GameSession.findOne({ code });

    if (!game || game.state !== 'in-progress') {
      throw new Error('Game not in progress');
    }

    const currentQuestionId: string = game.questionIds[game.currentQuestionIndex].toString();
    const question: IQuestion | null = await Question.findById(currentQuestionId);

    if (!question) {
      throw new Error('Question not found');
    }

    // Award 100 pts to each player with a correct answer for the current questionId
    for (const player of game.players) {
      const answer: IPlayerAnswer | undefined = player.answers.find(
        (a) => a.questionId === currentQuestionId
      );
      if (answer?.isCorrect) {
        player.score += 100;
      }
    }

    // Mark reveal as done
    game.questionStartTime = null;
    await game.save();

    logger.info('Answers revealed', { code, questionIndex: game.currentQuestionIndex });

    return {
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
      scores: game.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score })),
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
      game.questionStartTime = null;
      await game.save();

      const questions: IQuestion[] = await Question.find({
        _id: { $in: game.questionIds },
      });

      logger.info('Game ended (all questions completed)', { code });

      return { ended: true, game, questions };
    }

    game.currentQuestionIndex = nextIndex;
    game.questionStartTime = Date.now();
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
    game.questionStartTime = null;
    await game.save();

    const questions: IQuestion[] = await Question.find({
      _id: { $in: game.questionIds },
    });

    logger.info('Game ended early', { code });

    return { game, questions };
  }
}
