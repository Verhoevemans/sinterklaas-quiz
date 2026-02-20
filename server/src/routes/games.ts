import { Router, Request, Response } from 'express';
import { GameSession, IGameSession, IPlayer } from '../models/GameSession.js';
import { Question, IQuestion } from '../models/Question.js';

const router: Router = Router();

// Helper to generate a unique 6-digit game code
async function generateUniqueGameCode(): Promise<string> {
  let code: string;
  let exists: boolean = true;

  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing: IGameSession | null = await GameSession.findOne({ code });
    exists = existing !== null;
  }

  return code!;
}

// Helper to generate player ID
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// POST /api/games - Create new game
router.post('/', async (req: Request, res: Response): Promise<void> => {
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

    const code: string = await generateUniqueGameCode();
    const hostId: string = generatePlayerId();

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

    res.status(201).json({
      code,
      playerId: hostId,
      game: gameSession,
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/games/:code - Get game by code
router.get('/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const game: IGameSession | null = await GameSession.findOne({ code: req.params.code });

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
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /api/games/:code/join - Join game with nickname
router.post('/:code/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { nickname } = req.body;

    if (!nickname || nickname.length < 3 || nickname.length > 20) {
      res.status(400).json({ error: 'Nickname must be between 3 and 20 characters' });
      return;
    }

    const game: IGameSession | null = await GameSession.findOne({ code: req.params.code });

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

    const playerId: string = generatePlayerId();
    const newPlayer: IPlayer = {
      id: playerId,
      nickname,
      score: 0,
      answers: [],
      isHost: false,
    };

    game.players.push(newPlayer);
    await game.save();

    res.status(201).json({
      playerId,
      game,
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// GET /api/games/:code/questions/:index - Get question by index (for game play)
router.get('/:code/questions/:index', async (req: Request, res: Response): Promise<void> => {
  try {
    const index: number = parseInt(req.params.index);
    const game: IGameSession | null = await GameSession.findOne({ code: req.params.code });

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
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

export default router;
